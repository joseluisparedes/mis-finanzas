-- ==============================================
-- ACTUALIZAR SISTEMA PARA INCLUIR ROL 'FAMILY'
-- ==============================================

-- 1. Actualizar constraint para incluir 'family'
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_type_check;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_subscription_type_check 
CHECK (subscription_type IN ('free', 'premium', 'admin', 'family'));

-- 2. Actualizar función set_subscription_limits para incluir family
CREATE OR REPLACE FUNCTION set_subscription_limits(
    sub_type TEXT,
    user_uuid UUID
)
RETURNS VOID AS $$
BEGIN
    CASE sub_type
        WHEN 'free' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = 30,
                budget_limit = 2,
                custom_category_limit = 3,
                custom_payment_method_limit = 2,
                custom_income_type_limit = 1,
                recurring_transaction_limit = 5,
                report_months_limit = 3,
                multi_currency_enabled = false,
                excel_export_enabled = false,
                excel_import_enabled = false,
                advanced_reports_enabled = false
            WHERE user_id = user_uuid;
            
        WHEN 'premium' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = -1, -- Ilimitado
                budget_limit = -1, -- Ilimitado
                custom_category_limit = -1, -- Ilimitado
                custom_payment_method_limit = -1, -- Ilimitado
                custom_income_type_limit = -1, -- Ilimitado
                recurring_transaction_limit = -1, -- Ilimitado
                report_months_limit = -1, -- Sin límite
                multi_currency_enabled = true,
                excel_export_enabled = true,
                excel_import_enabled = true,
                advanced_reports_enabled = true
            WHERE user_id = user_uuid;
            
        WHEN 'family' THEN
            -- Family tiene TODOS los beneficios Premium pero gratis
            UPDATE user_subscriptions SET
                monthly_transaction_limit = -1, -- Ilimitado
                budget_limit = -1, -- Ilimitado
                custom_category_limit = -1, -- Ilimitado
                custom_payment_method_limit = -1, -- Ilimitado
                custom_income_type_limit = -1, -- Ilimitado
                recurring_transaction_limit = -1, -- Ilimitado
                report_months_limit = -1, -- Sin límite
                multi_currency_enabled = true,
                excel_export_enabled = true,
                excel_import_enabled = true,
                advanced_reports_enabled = true,
                price_paid = 0.00, -- GRATIS para familia
                billing_period = NULL,
                expires_at = NULL, -- No expira nunca
                notes = 'Familia - Acceso gratuito permanente'
            WHERE user_id = user_uuid;
            
        WHEN 'admin' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = -1, -- Ilimitado
                budget_limit = -1, -- Ilimitado
                custom_category_limit = -1, -- Ilimitado
                custom_payment_method_limit = -1, -- Ilimitado
                custom_income_type_limit = -1, -- Ilimitado
                recurring_transaction_limit = -1, -- Ilimitado
                report_months_limit = -1, -- Sin límite
                multi_currency_enabled = true,
                excel_export_enabled = true,
                excel_import_enabled = true,
                advanced_reports_enabled = true
            WHERE user_id = user_uuid;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para promover a Family
CREATE OR REPLACE FUNCTION promote_user_to_family(target_user_email TEXT, family_note TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    subscription_exists BOOLEAN;
    result JSON;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Verificar si ya tiene suscripción
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = target_user_id
    ) INTO subscription_exists;
    
    IF subscription_exists THEN
        -- Actualizar suscripción existente
        UPDATE user_subscriptions 
        SET 
            subscription_type = 'family',
            status = 'active',
            price_paid = 0.00,
            currency = 'PEN',
            billing_period = NULL,
            expires_at = NULL,
            cancelled_at = NULL,
            notes = COALESCE(family_note, 'Familia - Acceso gratuito permanente'),
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSE
        -- Crear nueva suscripción
        INSERT INTO user_subscriptions (
            user_id,
            subscription_type,
            status,
            price_paid,
            currency,
            notes
        ) VALUES (
            target_user_id,
            'family',
            'active',
            0.00,
            'PEN',
            COALESCE(family_note, 'Familia - Acceso gratuito permanente')
        );
    END IF;
    
    -- Aplicar límites de family (ilimitado como premium)
    PERFORM set_subscription_limits('family', target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a Family exitosamente',
        'user_id', target_user_id,
        'subscription_created', NOT subscription_exists
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función universal para cambiar cualquier tipo de suscripción
CREATE OR REPLACE FUNCTION change_user_subscription(
    target_user_email TEXT,
    new_subscription_type TEXT,
    payment_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    subscription_exists BOOLEAN;
    price_amount DECIMAL(10,2) := 0.00;
    expires_at_date TIMESTAMPTZ := NULL;
    billing_period_val TEXT := NULL;
    notes_val TEXT := NULL;
    result JSON;
BEGIN
    -- Validar tipo de suscripción
    IF new_subscription_type NOT IN ('free', 'premium', 'admin', 'family') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Tipo de suscripción inválido'
        );
    END IF;
    
    -- Buscar el usuario por email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Configurar valores según el tipo
    CASE new_subscription_type
        WHEN 'premium' THEN
            price_amount := COALESCE((payment_info->>'price')::DECIMAL(10,2), 15.00);
            billing_period_val := COALESCE(payment_info->>'billing_period', 'monthly');
            expires_at_date := CASE 
                WHEN billing_period_val = 'yearly' THEN NOW() + INTERVAL '365 days'
                ELSE NOW() + INTERVAL '30 days'
            END;
        WHEN 'family' THEN
            price_amount := 0.00;
            notes_val := COALESCE(payment_info->>'notes', 'Familia - Acceso gratuito permanente');
        WHEN 'admin' THEN
            notes_val := 'Administrador del sistema';
    END CASE;
    
    -- Verificar si ya tiene suscripción
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = target_user_id
    ) INTO subscription_exists;
    
    IF subscription_exists THEN
        -- Actualizar suscripción existente
        UPDATE user_subscriptions 
        SET 
            subscription_type = new_subscription_type,
            status = 'active',
            price_paid = price_amount,
            currency = 'PEN',
            billing_period = billing_period_val,
            expires_at = expires_at_date,
            cancelled_at = NULL,
            notes = notes_val,
            is_early_bird = COALESCE((payment_info->>'is_early_bird')::BOOLEAN, false),
            early_bird_price = CASE 
                WHEN (payment_info->>'is_early_bird')::BOOLEAN = true THEN price_amount 
                ELSE NULL 
            END,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSE
        -- Crear nueva suscripción
        INSERT INTO user_subscriptions (
            user_id,
            subscription_type,
            status,
            price_paid,
            currency,
            billing_period,
            expires_at,
            notes,
            is_early_bird,
            early_bird_price
        ) VALUES (
            target_user_id,
            new_subscription_type,
            'active',
            price_amount,
            'PEN',
            billing_period_val,
            expires_at_date,
            notes_val,
            COALESCE((payment_info->>'is_early_bird')::BOOLEAN, false),
            CASE WHEN (payment_info->>'is_early_bird')::BOOLEAN = true THEN price_amount ELSE NULL END
        );
    END IF;
    
    -- Aplicar límites correspondientes
    PERFORM set_subscription_limits(new_subscription_type, target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Suscripción actualizada exitosamente',
        'user_id', target_user_id,
        'subscription_type', new_subscription_type,
        'price_paid', price_amount,
        'subscription_created', NOT subscription_exists
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar estadísticas para incluir family
CREATE OR REPLACE FUNCTION get_subscription_stats_extended()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(*) FILTER (WHERE subscription_type = 'free'),
        'premium_users', COUNT(*) FILTER (WHERE subscription_type = 'premium'),
        'family_users', COUNT(*) FILTER (WHERE subscription_type = 'family'),
        'admin_users', COUNT(*) FILTER (WHERE subscription_type = 'admin'),
        'early_bird_users', COUNT(*) FILTER (WHERE is_early_bird = true),
        'active_subscriptions', COUNT(*) FILTER (WHERE status = 'active'),
        'total_revenue', COALESCE(SUM(price_paid), 0),
        'monthly_revenue', COALESCE(
            SUM(price_paid) FILTER (WHERE billing_period = 'monthly'), 0
        ),
        'yearly_revenue', COALESCE(
            SUM(price_paid) FILTER (WHERE billing_period = 'yearly'), 0
        )
    ) INTO result
    FROM user_subscriptions;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EJEMPLOS DE USO:

-- Promover a familia
-- SELECT promote_user_to_family('mama@familia.com', 'Mamá - Acceso familiar');

-- Cambiar cualquier suscripción
-- SELECT change_user_subscription('usuario@test.com', 'premium', '{"price": 5.00, "is_early_bird": true, "billing_period": "monthly"}');
-- SELECT change_user_subscription('hermano@familia.com', 'family', '{"notes": "Hermano - Acceso familiar"}');

-- Ver estadísticas extendidas
-- SELECT get_subscription_stats_extended();