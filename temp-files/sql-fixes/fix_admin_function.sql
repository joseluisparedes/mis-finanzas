-- CORRECCIÓN: Función admin que NO devuelve usuarios eliminados (sin suscripción)

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
    
    -- CAMBIO CRÍTICO: INNER JOIN en lugar de LEFT JOIN
    -- Solo devuelve usuarios que SÍ TIENEN suscripción
    WITH user_data AS (
        SELECT 
            us.id,
            us.user_id,
            us.subscription_type,
            us.status,
            us.created_at,
            us.updated_at,
            us.started_at,
            us.expires_at,
            us.is_early_bird,
            us.early_bird_price,
            us.price_paid,
            us.payment_method,
            au.email as user_email,
            au.created_at as user_created_at
        FROM user_subscriptions us
        INNER JOIN auth.users au ON us.user_id = au.id  -- INNER JOIN = solo usuarios CON suscripción
        WHERE us.user_id IS NOT NULL                     -- Filtro adicional de seguridad
        AND us.status IN ('active', 'suspended', 'deleted') -- Incluir usuarios eliminados
        ORDER BY us.created_at DESC
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'user_id', user_id,
            'subscription_type', subscription_type,
            'status', status,
            'created_at', created_at,
            'updated_at', updated_at,
            'started_at', started_at,
            'expires_at', expires_at,
            'is_early_bird', is_early_bird,
            'early_bird_price', early_bird_price,
            'price_paid', price_paid,
            'payment_method', payment_method,
            'user_email', user_email,
            'user_created_at', user_created_at
        )
    ) INTO result
    FROM user_data;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;