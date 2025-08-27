-- CORREGIR CONTADOR DE PREMIUM EB EN PROMOCIONES

-- Función corregida para estadísticas de promociones
CREATE OR REPLACE FUNCTION get_promotion_stats(admin_user_id UUID)
RETURNS JSON AS $$
DECLARE
    is_admin BOOLEAN;
    stats_result JSON;
    premium_eb_count INTEGER;
    total_eb_revenue DECIMAL;
BEGIN
    -- Verificar si es admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object(
            'error', 'Acceso denegado - Solo administradores'
        );
    END IF;
    
    -- Contar usuarios Premium Early Bird correctamente
    SELECT COUNT(*) INTO premium_eb_count
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' 
    AND is_early_bird = true 
    AND status = 'active';
    
    -- Calcular ingresos de Early Bird
    SELECT COALESCE(SUM(price_paid), 0) INTO total_eb_revenue
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' 
    AND is_early_bird = true 
    AND status = 'active';
    
    -- Obtener estadísticas de promociones activas
    SELECT json_build_object(
        'promotions', COALESCE(json_agg(
            json_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'original_price', p.original_price,
                'promo_price', p.promo_price,
                'max_users', p.max_users,
                'current_users', p.current_users,
                'spots_left', p.max_users - p.current_users,
                'active', p.active,
                'created_at', p.created_at,
                'users_list', COALESCE((
                    SELECT json_agg(
                        json_build_object(
                            'user_id', pu.user_id,
                            'email', au.email,
                            'joined_at', pu.joined_at,
                            'transaction_id', pu.transaction_id,
                            'amount_paid', pu.amount_paid
                        )
                    )
                    FROM promotion_users pu
                    LEFT JOIN auth.users au ON pu.user_id = au.id
                    WHERE pu.promotion_id = p.id
                ), '[]'::json)
            )
        ), '[]'::json),
        'total_early_birds', premium_eb_count,
        'total_revenue_early_bird', total_eb_revenue,
        'active_promotions', (
            SELECT COUNT(*) FROM promotions WHERE active = true
        ),
        'total_promotions', (
            SELECT COUNT(*) FROM promotions
        )
    ) INTO stats_result
    FROM promotions p;
    
    RETURN stats_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- Permisos
GRANT EXECUTE ON FUNCTION get_promotion_stats(UUID) TO authenticated;

SELECT 'CONTADOR DE PREMIUM EB CORREGIDO' as resultado;