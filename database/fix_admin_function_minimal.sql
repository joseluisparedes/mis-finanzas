-- ====================================================================
-- CORRECCIÓN QUIRÚRGICA: Mostrar usuarios DELETED en panel admin
-- ====================================================================
-- Problema: get_all_subscriptions_admin() no muestra usuarios con status='deleted'
-- Solución: Verificar y corregir la función para incluir TODOS los status
-- ====================================================================

-- 1. Verificar la función actual
SELECT 
    '=== VERIFICANDO FUNCIÓN ACTUAL ===' as info,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'get_all_subscriptions_admin';

-- 2. Recrear la función con la corrección
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

-- 3. Test inmediato: Verificar que ahora incluye el usuario deleted
SELECT 
    '=== TEST: USUARIOS QUE DEVUELVE LA FUNCIÓN ===' as info,
    jsonb_pretty(get_all_subscriptions_admin()::jsonb) as result_preview;

-- 4. Contar usuarios por status en el resultado
WITH function_result AS (
    SELECT json_array_elements(get_all_subscriptions_admin()) as user_data
),
status_count AS (
    SELECT 
        user_data->>'status' as status,
        user_data->>'user_email' as email,
        COUNT(*) as count
    FROM function_result
    GROUP BY user_data->>'status', user_data->>'user_email'
)
SELECT 
    '=== RESUMEN POR STATUS ===' as info,
    status,
    COUNT(*) as total_users,
    string_agg(email, ', ') as emails
FROM status_count
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'active' THEN 1 
        WHEN 'suspended' THEN 2 
        WHEN 'deleted' THEN 3 
        ELSE 4 
    END;

-- ====================================================================
-- RESULTADO ESPERADO:
-- - Debe aparecer 1 usuario con status 'deleted'
-- - Email: contacto.laesquinadelshopper@gmail.com
-- - Ahora el frontend podrá mostrar el botón "Reactivar"
-- ====================================================================