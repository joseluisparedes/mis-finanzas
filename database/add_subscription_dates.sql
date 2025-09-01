-- Agregar fechas de inicio/fin de suscripción a la tabla user_subscriptions
-- Este script es necesario para implementar alertas de vencimiento

-- 1. Agregar columnas de fechas si no existen
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Actualizar registros existentes para tener fechas de inicio
UPDATE user_subscriptions 
SET subscription_start_date = COALESCE(started_at, created_at, NOW())
WHERE subscription_start_date IS NULL;

-- 3. Función para calcular fecha de finalización basada en el tipo de plan
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
    start_date TIMESTAMP WITH TIME ZONE,
    subscription_type TEXT,
    billing_period TEXT DEFAULT 'monthly'
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Para planes gratuitos, no hay fecha de finalización
    IF subscription_type = 'free' THEN
        RETURN NULL;
    END IF;
    
    -- Para planes premium y early bird
    IF billing_period = 'annual' THEN
        RETURN start_date + INTERVAL '1 year';
    ELSE
        -- Por defecto mensual
        RETURN start_date + INTERVAL '1 month';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para verificar si una suscripción está próxima a vencer
CREATE OR REPLACE FUNCTION is_subscription_expiring_soon(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_record RECORD;
    days_until_expiry INTEGER;
    is_expiring BOOLEAN DEFAULT FALSE;
    warning_message TEXT;
BEGIN
    -- Obtener datos de suscripción
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    LIMIT 1
    INTO subscription_record;
    
    -- Si no hay suscripción o es gratuita, no vence
    IF subscription_record IS NULL OR subscription_record.subscription_type = 'free' THEN
        RETURN json_build_object(
            'is_expiring', false,
            'days_until_expiry', null,
            'warning_message', null,
            'subscription_end_date', null
        );
    END IF;
    
    -- Si no hay fecha de finalización, calcular
    IF subscription_record.subscription_end_date IS NULL THEN
        -- Asumir mensual si no se especifica
        subscription_record.subscription_end_date := calculate_subscription_end_date(
            subscription_record.subscription_start_date,
            subscription_record.subscription_type,
            'monthly'
        );
        
        -- Actualizar la base de datos
        UPDATE user_subscriptions 
        SET subscription_end_date = subscription_record.subscription_end_date
        WHERE id = subscription_record.id;
    END IF;
    
    -- Calcular días hasta el vencimiento
    days_until_expiry := EXTRACT(DAY FROM (subscription_record.subscription_end_date - NOW()));
    
    -- Determinar si está próximo a vencer (3 días o menos)
    IF days_until_expiry <= 3 AND days_until_expiry >= 0 THEN
        is_expiring := TRUE;
        IF days_until_expiry = 0 THEN
            warning_message := 'Tu suscripción vence hoy. ¡Renueva ahora para mantener acceso completo!';
        ELSIF days_until_expiry = 1 THEN
            warning_message := 'Tu suscripción vence mañana. Renueva para evitar limitaciones.';
        ELSE
            warning_message := format('Tu suscripción vence en %s días. Considera renovar pronto.', days_until_expiry);
        END IF;
    ELSIF days_until_expiry < 0 THEN
        is_expiring := TRUE;
        warning_message := format('Tu suscripción venció hace %s días. Renueva para recuperar acceso completo.', ABS(days_until_expiry));
    END IF;
    
    RETURN json_build_object(
        'is_expiring', is_expiring,
        'days_until_expiry', days_until_expiry,
        'warning_message', warning_message,
        'subscription_end_date', subscription_record.subscription_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC function para obtener usuarios con suscripciones próximas a vencer (para admin)
CREATE OR REPLACE FUNCTION get_expiring_subscriptions_admin()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    display_name TEXT,
    subscription_type TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    days_until_expiry INTEGER,
    warning_message TEXT
) AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT is_admin FROM user_subscriptions 
    WHERE user_subscriptions.user_id = current_user_id AND user_subscriptions.is_admin = true
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Retornar usuarios con suscripciones próximas a vencer
    RETURN QUERY
    SELECT 
        us.user_id,
        au.email,
        COALESCE(up.display_name, au.email) as display_name,
        us.subscription_type,
        us.subscription_end_date,
        EXTRACT(DAY FROM (us.subscription_end_date - NOW()))::INTEGER as days_until_expiry,
        CASE 
            WHEN EXTRACT(DAY FROM (us.subscription_end_date - NOW())) <= 0 THEN
                'Suscripción vencida'
            WHEN EXTRACT(DAY FROM (us.subscription_end_date - NOW())) <= 3 THEN
                format('Vence en %s días', EXTRACT(DAY FROM (us.subscription_end_date - NOW()))::INTEGER)
            ELSE
                'Activa'
        END as warning_message
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    LEFT JOIN user_profiles up ON us.user_id = up.user_id
    WHERE us.status = 'active' 
      AND us.subscription_type != 'free'
      AND us.subscription_end_date IS NOT NULL
      AND EXTRACT(DAY FROM (us.subscription_end_date - NOW())) <= 7 -- Próximos 7 días o ya vencidas
    ORDER BY us.subscription_end_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Actualizar función existente de get_user_subscription_info para incluir fechas
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    expiry_info JSON;
    result JSON;
BEGIN
    -- Buscar suscripción activa
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid
    LIMIT 1
    INTO subscription_data;
    
    -- Si no existe, crear FREE por defecto
    IF subscription_data IS NULL THEN
        INSERT INTO user_subscriptions (
            user_id, subscription_type, status,
            monthly_transaction_limit, budget_limit, custom_category_limit,
            custom_payment_method_limit, custom_income_type_limit,
            recurring_transaction_limit, report_months_limit,
            multi_currency_enabled, excel_export_enabled, 
            excel_import_enabled, advanced_reports_enabled,
            subscription_start_date
        )
        VALUES (
            user_uuid, 'free', 'active',
            30, 2, 3, 2, 1, 5, 3,
            false, false, false, false,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO subscription_data;
    END IF;
    
    -- Obtener información de vencimiento
    SELECT is_subscription_expiring_soon(user_uuid) INTO expiry_info;
    
    -- Construir JSON de respuesta
    result := json_build_object(
        'subscription', json_build_object(
            'id', subscription_data.id,
            'type', subscription_data.subscription_type,
            'status', subscription_data.status,
            'started_at', subscription_data.started_at,
            'subscription_start_date', subscription_data.subscription_start_date,
            'subscription_end_date', subscription_data.subscription_end_date,
            'is_early_bird', COALESCE(subscription_data.is_early_bird, false),
            'early_bird_price', subscription_data.early_bird_price
        ),
        'expiry_info', expiry_info,
        'limits', json_build_object(
            'monthly_transactions', json_build_object(
                'limit', subscription_data.monthly_transaction_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.monthly_transaction_limit = -1 THEN -1 
                    ELSE subscription_data.monthly_transaction_limit 
                END
            ),
            'budgets', json_build_object(
                'limit', subscription_data.budget_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.budget_limit = -1 THEN -1 
                    ELSE subscription_data.budget_limit 
                END
            ),
            'categories', json_build_object(
                'limit', subscription_data.custom_category_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_category_limit = -1 THEN -1 
                    ELSE subscription_data.custom_category_limit 
                END
            ),
            'payment_methods', json_build_object(
                'limit', subscription_data.custom_payment_method_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 
                    ELSE subscription_data.custom_payment_method_limit 
                END
            ),
            'income_types', json_build_object(
                'limit', subscription_data.custom_income_type_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_income_type_limit = -1 THEN -1 
                    ELSE subscription_data.custom_income_type_limit 
                END
            ),
            'recurring_transactions', json_build_object(
                'limit', subscription_data.recurring_transaction_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.recurring_transaction_limit = -1 THEN -1 
                    ELSE subscription_data.recurring_transaction_limit 
                END
            )
        ),
        'features', json_build_object(
            'multi_currency_enabled', subscription_data.multi_currency_enabled,
            'excel_export_enabled', subscription_data.excel_export_enabled,
            'excel_import_enabled', subscription_data.excel_import_enabled,
            'advanced_reports_enabled', subscription_data.advanced_reports_enabled,
            'report_months_limit', subscription_data.report_months_limit
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Mensaje de confirmación
SELECT 'Subscription date tracking system created successfully!' as result;
SELECT 'New columns: subscription_start_date, subscription_end_date' as columns_added;
SELECT 'New functions: calculate_subscription_end_date, is_subscription_expiring_soon, get_expiring_subscriptions_admin' as functions_added;