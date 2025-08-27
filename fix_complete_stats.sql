-- FUNCIÓN COMPLETA DE ESTADÍSTICAS PARA TODOS LOS PLANES
-- Incluye: free, premium, family, admin

CREATE OR REPLACE FUNCTION get_subscription_stats_complete()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(CASE WHEN subscription_type = 'free' THEN 1 END),
        'premium_users', COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END),
        'family_users', COUNT(CASE WHEN subscription_type = 'family' THEN 1 END),
        'admin_users', COUNT(CASE WHEN subscription_type = 'admin' THEN 1 END),
        'active_users', COUNT(CASE WHEN status = 'active' THEN 1 END),
        'suspended_users', COUNT(CASE WHEN status = 'suspended' THEN 1 END),
        'early_bird_users', COUNT(CASE WHEN is_early_bird = true THEN 1 END),
        'total_revenue', COALESCE(SUM(CASE WHEN subscription_type = 'premium' AND status = 'active' THEN price_paid ELSE 0 END), 0)
    )
    FROM user_subscriptions
    INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazar la función simple con la completa
CREATE OR REPLACE FUNCTION get_subscription_stats_simple()
RETURNS JSON AS $$
BEGIN
    -- Usar la función completa
    RETURN get_subscription_stats_complete();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_subscription_stats_complete() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats_simple() TO authenticated;

-- Verificar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- Probar la función
SELECT 'ESTADÍSTICAS COMPLETAS:' as info;
SELECT get_subscription_stats_complete();

SELECT 'FUNCIÓN SIMPLE ACTUALIZADA:' as info;  
SELECT get_subscription_stats_simple();