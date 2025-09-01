-- CORRECCIÓN COMPLETA DE ERRORES ADMINPANEL
-- ============================================

-- 1. CORREGIR POLÍTICA RLS DE subscription_change_log
-- ====================================================

-- Eliminar política existente
DROP POLICY IF EXISTS "Admins can view all subscription changes" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage subscription changes" ON subscription_change_log;

-- Crear política completa para admins (SELECT + INSERT)
CREATE POLICY "Admins can manage subscription changes" ON subscription_change_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- 2. AGREGAR FUNCIÓN FALTANTE get_expiring_subscriptions_admin
-- ==========================================================

CREATE OR REPLACE FUNCTION get_expiring_subscriptions_admin()
RETURNS JSON AS $$
DECLARE
    is_admin BOOLEAN;
    expiring_users JSON;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('error', 'No admin permissions');
    END IF;
    
    -- Obtener usuarios con suscripciones próximas a vencer (3 días o menos)
    SELECT json_agg(
        json_build_object(
            'user_id', us.user_id,
            'user_email', au.email,
            'subscription_type', us.subscription_type,
            'subscription_end_date', us.subscription_end_date,
            'days_until_expiry', EXTRACT(DAY FROM (us.subscription_end_date - NOW())),
            'is_expired', us.subscription_end_date < NOW()
        )
    ) INTO expiring_users
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    WHERE us.subscription_end_date IS NOT NULL
    AND us.subscription_type IN ('premium', 'early_bird')
    AND us.subscription_end_date <= NOW() + INTERVAL '3 days';
    
    RETURN COALESCE(expiring_users, '[]'::json);

EXCEPTION 
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Internal error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CORREGIR POLÍTICAS RLS DE user_subscriptions PARA ADMIN
-- ===========================================================

-- Verificar si existe política y eliminarla
DROP POLICY IF EXISTS "Admins can manage user subscriptions" ON user_subscriptions;

-- Crear política completa para admins
CREATE POLICY "Admins can manage user subscriptions" ON user_subscriptions 
    FOR ALL USING (
        -- El usuario puede ver/editar su propia suscripción
        user_id = auth.uid()
        OR
        -- O es admin
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- 4. OTORGAR PERMISOS A NUEVAS FUNCIONES
-- ======================================

GRANT EXECUTE ON FUNCTION get_expiring_subscriptions_admin() TO authenticated;

-- 5. VERIFICAR QUE is_current_user_admin EXISTE
-- =============================================

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() 
        AND subscription_type = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;

-- 6. MENSAJES DE CONFIRMACIÓN
-- ===========================

SELECT 'AdminPanel errors fixed successfully!' as status;
SELECT 'Fixed: RLS policies, missing functions, permissions' as details;
SELECT 'Ready to test all functionalities' as next_step;