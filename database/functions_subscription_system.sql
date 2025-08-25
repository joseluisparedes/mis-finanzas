-- ==============================================
-- FUNCIONES SQL PARA SISTEMA DE SUSCRIPCIONES
-- Versión: 1.0
-- ==============================================

-- ==============================================
-- 1. FUNCIÓN: Obtener información completa de suscripción
-- ==============================================
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    user_stats RECORD;
    current_period_start DATE;
    result JSON;
BEGIN
    -- Obtener información de suscripción
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    INTO subscription_data;
    
    -- Si no existe suscripción, crear una por defecto
    IF subscription_data IS NULL THEN
        INSERT INTO user_subscriptions (user_id, subscription_type, status)
        VALUES (user_uuid, 'free', 'active')
        RETURNING * INTO subscription_data;
    END IF;
    
    -- Calcular inicio del período actual (primer día del mes)
    current_period_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Obtener estadísticas actuales del usuario para este mes
    WITH user_current_stats AS (
        SELECT
            -- Transacciones del mes actual
            COALESCE((
                SELECT COUNT(*) FROM gastos 
                WHERE user_id = user_uuid 
                AND DATE(fecha_gasto) >= current_period_start
            ), 0) + 
            COALESCE((
                SELECT COUNT(*) FROM ingresos 
                WHERE user_id = user_uuid 
                AND DATE(fecha_ingreso) >= current_period_start
            ), 0) as current_transactions,
            
            -- Presupuestos activos
            COALESCE((
                SELECT COUNT(*) FROM budgets 
                WHERE user_id = user_uuid 
                AND is_active = true
            ), 0) as current_budgets,
            
            -- Categorías personalizadas
            COALESCE((
                SELECT COUNT(*) FROM categories 
                WHERE user_id = user_uuid 
                AND is_default = false
            ), 0) as current_categories,
            
            -- Métodos de pago personalizados
            COALESCE((
                SELECT COUNT(*) FROM payment_methods 
                WHERE user_id = user_uuid 
                AND is_default = false
            ), 0) as current_payment_methods,
            
            -- Tipos de ingreso personalizados
            COALESCE((
                SELECT COUNT(*) FROM income_types 
                WHERE user_id = user_uuid 
                AND is_default = false
            ), 0) as current_income_types,
            
            -- Transacciones recurrentes
            COALESCE((
                SELECT COUNT(*) FROM recurring_transactions 
                WHERE user_id = user_uuid 
                AND is_active = true
            ), 0) as current_recurring
    )
    SELECT * FROM user_current_stats INTO user_stats;
    
    -- Construir respuesta JSON
    result := json_build_object(
        'subscription', json_build_object(
            'id', subscription_data.id,
            'type', subscription_data.subscription_type,
            'status', subscription_data.status,
            'started_at', subscription_data.started_at,
            'is_early_bird', subscription_data.is_early_bird,
            'early_bird_price', subscription_data.early_bird_price
        ),
        'limits', json_build_object(
            'monthly_transactions', json_build_object(
                'limit', CASE WHEN subscription_data.monthly_transaction_limit = -1 THEN -1 ELSE subscription_data.monthly_transaction_limit END,
                'current', user_stats.current_transactions,
                'available', CASE 
                    WHEN subscription_data.monthly_transaction_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.monthly_transaction_limit - user_stats.current_transactions) 
                END
            ),
            'budgets', json_build_object(
                'limit', CASE WHEN subscription_data.budget_limit = -1 THEN -1 ELSE subscription_data.budget_limit END,
                'current', user_stats.current_budgets,
                'available', CASE 
                    WHEN subscription_data.budget_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.budget_limit - user_stats.current_budgets) 
                END
            ),
            'categories', json_build_object(
                'limit', CASE WHEN subscription_data.custom_category_limit = -1 THEN -1 ELSE subscription_data.custom_category_limit END,
                'current', user_stats.current_categories,
                'available', CASE 
                    WHEN subscription_data.custom_category_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_category_limit - user_stats.current_categories) 
                END
            ),
            'payment_methods', json_build_object(
                'limit', CASE WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 ELSE subscription_data.custom_payment_method_limit END,
                'current', user_stats.current_payment_methods,
                'available', CASE 
                    WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_payment_method_limit - user_stats.current_payment_methods) 
                END
            ),
            'income_types', json_build_object(
                'limit', CASE WHEN subscription_data.custom_income_type_limit = -1 THEN -1 ELSE subscription_data.custom_income_type_limit END,
                'current', user_stats.current_income_types,
                'available', CASE 
                    WHEN subscription_data.custom_income_type_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_income_type_limit - user_stats.current_income_types) 
                END
            ),
            'recurring_transactions', json_build_object(
                'limit', CASE WHEN subscription_data.recurring_transaction_limit = -1 THEN -1 ELSE subscription_data.recurring_transaction_limit END,
                'current', user_stats.current_recurring,
                'available', CASE 
                    WHEN subscription_data.recurring_transaction_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.recurring_transaction_limit - user_stats.current_recurring) 
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

-- ==============================================
-- 2. FUNCIÓN: Verificar límite específico
-- ==============================================
CREATE OR REPLACE FUNCTION check_user_limit(user_uuid UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_info JSON;
    limit_data JSON;
    available INTEGER;
BEGIN
    -- Obtener información de suscripción
    subscription_info := get_user_subscription_info(user_uuid);
    
    -- Extraer información del límite específico
    limit_data := subscription_info->'limits'->limit_type;
    
    IF limit_data IS NULL THEN
        RETURN false;
    END IF;
    
    -- Obtener cantidad disponible
    available := (limit_data->>'available')::INTEGER;
    
    -- Si es -1 significa ilimitado
    IF available = -1 THEN
        RETURN true;
    END IF;
    
    -- Si tiene disponible > 0, puede crear
    RETURN available > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 3. FUNCIÓN: Promover usuario a admin
-- ==============================================
CREATE OR REPLACE FUNCTION promote_user_to_admin(admin_uuid UUID, target_email TEXT)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    updated_subscription RECORD;
BEGIN
    -- Verificar que el usuario solicitante es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = admin_uuid 
        AND subscription_type = 'admin' 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Usuario no tiene permisos de administrador';
    END IF;
    
    -- Buscar usuario objetivo por email
    SELECT id FROM auth.users WHERE email = target_email INTO target_user_id;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', target_email;
    END IF;
    
    -- Actualizar o crear suscripción de admin
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled, 
        excel_import_enabled, advanced_reports_enabled
    )
    VALUES (
        target_user_id, 'admin', 'active',
        -1, -1, -1, -1, -1, -1, -1,
        true, true, true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = 'admin',
        status = 'active',
        monthly_transaction_limit = -1,
        budget_limit = -1,
        custom_category_limit = -1,
        custom_payment_method_limit = -1,
        custom_income_type_limit = -1,
        recurring_transaction_limit = -1,
        report_months_limit = -1,
        multi_currency_enabled = true,
        excel_export_enabled = true,
        excel_import_enabled = true,
        advanced_reports_enabled = true,
        updated_at = NOW()
    RETURNING * INTO updated_subscription;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a administrador exitosamente',
        'user_email', target_email,
        'subscription_type', updated_subscription.subscription_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 4. FUNCIÓN: Obtener estadísticas de suscripciones
-- ==============================================
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    WITH subscription_stats AS (
        SELECT
            subscription_type,
            COUNT(*) as total_users,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
            COUNT(CASE WHEN is_early_bird = true THEN 1 END) as early_bird_users,
            AVG(CASE WHEN price_paid > 0 THEN price_paid END) as avg_price_paid
        FROM user_subscriptions
        GROUP BY subscription_type
    ),
    monthly_stats AS (
        SELECT
            DATE_TRUNC('month', created_at) as month,
            subscription_type,
            COUNT(*) as new_subscriptions
        FROM user_subscriptions
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at), subscription_type
        ORDER BY month DESC
    )
    SELECT json_build_object(
        'by_type', json_agg(json_build_object(
            'type', subscription_type,
            'total_users', total_users,
            'active_users', active_users,
            'early_bird_users', early_bird_users,
            'avg_price_paid', avg_price_paid
        )),
        'total_users', (SELECT COUNT(*) FROM user_subscriptions),
        'active_users', (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active'),
        'monthly_revenue', (
            SELECT COALESCE(SUM(price_paid), 0) 
            FROM user_subscriptions 
            WHERE subscription_type = 'premium' 
            AND status = 'active'
            AND billing_period = 'monthly'
        )
    ) FROM subscription_stats INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. TRIGGER: Crear suscripción automática para nuevos usuarios
-- ==============================================
CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear suscripción Free por defecto para nuevo usuario
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- ==============================================
-- 6. POLÍTICAS RLS PARA user_subscriptions
-- ==============================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo su propia suscripción
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Política: Los admins pueden ver todas las suscripciones
DROP POLICY IF EXISTS "user_subscriptions_select_admin" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_admin" ON user_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us
            WHERE us.user_id = auth.uid()
            AND us.subscription_type = 'admin'
            AND us.status = 'active'
        )
    );

-- Política: Los usuarios pueden actualizar su propia suscripción
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

-- Política: Los admins pueden actualizar cualquier suscripción
DROP POLICY IF EXISTS "user_subscriptions_update_admin" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update_admin" ON user_subscriptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us
            WHERE us.user_id = auth.uid()
            AND us.subscription_type = 'admin'
            AND us.status = 'active'
        )
    );

-- ==============================================
-- 7. FUNCIÓN: Hacer el usuario actual Admin (desarrollo)
-- ==============================================
CREATE OR REPLACE FUNCTION make_current_user_admin()
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    updated_subscription RECORD;
BEGIN
    -- Obtener ID del usuario actual
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Actualizar o crear suscripción de admin
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled, 
        excel_import_enabled, advanced_reports_enabled
    )
    VALUES (
        current_user_id, 'admin', 'active',
        -1, -1, -1, -1, -1, -1, -1,
        true, true, true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = 'admin',
        status = 'active',
        monthly_transaction_limit = -1,
        budget_limit = -1,
        custom_category_limit = -1,
        custom_payment_method_limit = -1,
        custom_income_type_limit = -1,
        recurring_transaction_limit = -1,
        report_months_limit = -1,
        multi_currency_enabled = true,
        excel_export_enabled = true,
        excel_import_enabled = true,
        advanced_reports_enabled = true,
        updated_at = NOW()
    RETURNING * INTO updated_subscription;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario actual promovido a administrador exitosamente',
        'user_id', current_user_id,
        'subscription_type', updated_subscription.subscription_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar para hacer admin al usuario actual (solo para desarrollo)
-- SELECT make_current_user_admin();