-- ==============================================
-- SOLUCIÓN FINAL: Políticas RLS sin conflictos
-- Permitir que admins accedan sin problemas circulares
-- ==============================================

-- 1. DESHABILITAR RLS TEMPORALMENTE PARA LIMPIAR
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS CONFLICTIVAS
DROP POLICY IF EXISTS "users_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "users_update_own" ON user_subscriptions;
DROP POLICY IF EXISTS "users_insert_own" ON user_subscriptions;
DROP POLICY IF EXISTS "admin_can_view_all" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;

-- 3. VERIFICAR QUE JOSÉ ES ADMIN EN LA TABLA
UPDATE user_subscriptions 
SET 
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
    advanced_reports_enabled = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 4. VERIFICAR EL RESULTADO
SELECT 
    'José status verification:' as info,
    u.email,
    us.subscription_type,
    us.status,
    us.monthly_transaction_limit,
    us.multi_currency_enabled
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jose241100@gmail.com';

-- 5. CREAR POLÍTICAS RLS MUY SIMPLES (sin recursión)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política básica: usuarios pueden ver solo su registro
CREATE POLICY "basic_user_select" ON user_subscriptions
    FOR SELECT 
    USING (user_id = auth.uid());

-- Política básica: usuarios pueden actualizar solo su registro  
CREATE POLICY "basic_user_update" ON user_subscriptions
    FOR UPDATE 
    USING (user_id = auth.uid());

-- Política básica: usuarios pueden insertar solo su registro
CREATE POLICY "basic_user_insert" ON user_subscriptions
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- 6. CREAR FUNCIONES ADMIN QUE BYPASSEN RLS
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
BEGIN
    -- Consultar directamente sin RLS
    SELECT subscription_type 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    INTO user_type;
    
    RETURN user_type = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN ADMIN PARA OBTENER SUSCRIPCIONES (bypasa RLS)
CREATE OR REPLACE FUNCTION get_all_subscriptions_admin()
RETURNS JSON AS $$
DECLARE
    result JSON;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin primero
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('error', 'No admin permissions');
    END IF;
    
    -- Obtener datos con privilegios elevados (bypasa RLS)
    SELECT json_agg(
        json_build_object(
            'id', us.id,
            'user_id', us.user_id,
            'subscription_type', us.subscription_type,
            'status', us.status,
            'started_at', us.started_at,
            'monthly_transaction_limit', us.monthly_transaction_limit,
            'budget_limit', us.budget_limit,
            'multi_currency_enabled', us.multi_currency_enabled,
            'excel_export_enabled', us.excel_export_enabled,
            'is_early_bird', us.is_early_bird,
            'early_bird_price', us.early_bird_price,
            'created_at', us.created_at,
            'updated_at', us.updated_at,
            'user_email', au.email,
            'user_created_at', au.created_at
        ) ORDER BY us.created_at DESC
    )
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN ADMIN PARA ESTADÍSTICAS (bypasa RLS)
CREATE OR REPLACE FUNCTION get_subscription_stats_simple()
RETURNS JSON AS $$
DECLARE
    stats JSON;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('error', 'No admin permissions');
    END IF;
    
    -- Obtener estadísticas con privilegios elevados
    SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(CASE WHEN subscription_type = 'free' THEN 1 END),
        'premium_users', COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END),
        'admin_users', COUNT(CASE WHEN subscription_type = 'admin' THEN 1 END),
        'active_users', COUNT(CASE WHEN status = 'active' THEN 1 END),
        'early_bird_users', COUNT(CASE WHEN is_early_bird = true THEN 1 END),
        'total_revenue', COALESCE(SUM(CASE WHEN subscription_type = 'premium' AND status = 'active' THEN price_paid ELSE 0 END), 0)
    )
    FROM user_subscriptions
    INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. PROBAR LAS FUNCIONES
SELECT 'Testing admin check for José...' as test;
SELECT is_current_user_admin() as is_jose_admin;

SELECT 'Testing admin subscriptions function...' as test;
SELECT get_all_subscriptions_admin();

SELECT 'Testing admin stats function...' as test;
SELECT get_subscription_stats_simple();

-- 10. RESULTADO FINAL
SELECT 'RLS policies fixed and admin functions created!' as result;
SELECT 'José should now have full admin access without circular dependencies' as info;