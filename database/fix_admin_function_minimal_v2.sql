-- ====================================================================
-- CORRECCIÓN QUIRÚRGICA V2: Mostrar usuarios DELETED en panel admin
-- ====================================================================
-- Problema: Test anterior falló, corregir y simplificar
-- ====================================================================

-- 1. Recrear la función con la corrección (sin test complejo)
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
    
    -- CORRECCIÓN: Incluir TODOS los usuarios con suscripción, incluso deleted
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
            us.notes,
            au.email as user_email,
            au.created_at as user_created_at
        FROM user_subscriptions us
        INNER JOIN auth.users au ON us.user_id = au.id  
        WHERE us.user_id IS NOT NULL                     
        AND us.status IN ('active', 'suspended', 'deleted') -- INCLUIR deleted explícitamente
        ORDER BY 
            CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END, -- José primero
            us.created_at DESC
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
            'notes', notes,
            'user_email', user_email,
            'user_created_at', user_created_at
        )
    ) INTO result
    FROM user_data;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Test simple: Verificar que incluye usuarios deleted
SELECT 
    '=== TEST SIMPLE ===' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN elem->>'status' = 'deleted' THEN 1 END) as usuarios_deleted,
    COUNT(CASE WHEN elem->>'status' = 'active' THEN 1 END) as usuarios_active
FROM (
    SELECT json_array_elements(
        CASE 
            WHEN json_typeof(get_all_subscriptions_admin()) = 'array' 
            THEN get_all_subscriptions_admin()
            ELSE '[]'::json
        END
    ) as elem
) t;

-- 3. Mostrar emails de usuarios deleted (si los hay)
SELECT 
    '=== USUARIOS DELETED ===' as info,
    elem->>'user_email' as email,
    elem->>'status' as status
FROM (
    SELECT json_array_elements(
        CASE 
            WHEN json_typeof(get_all_subscriptions_admin()) = 'array' 
            THEN get_all_subscriptions_admin()
            ELSE '[]'::json
        END
    ) as elem
) t
WHERE elem->>'status' = 'deleted';

-- ====================================================================
-- RESULTADO ESPERADO:
-- - usuarios_deleted: 1
-- - Email: contacto.laesquinadelshopper@gmail.com
-- ====================================================================