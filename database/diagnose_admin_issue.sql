-- ====================================================================
-- DIAGNÓSTICO DIRECTO: Por qué get_all_subscriptions_admin devuelve 0
-- ====================================================================

-- 1. Verificar si is_current_user_admin() funciona
SELECT 
    '=== VERIFICAR PERMISOS ADMIN ===' as info,
    is_current_user_admin() as is_admin,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Verificar datos directamente en la tabla
SELECT 
    '=== USUARIOS EN user_subscriptions ===' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted,
    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
FROM user_subscriptions;

-- 3. Ver usuarios con sus emails directamente
SELECT 
    '=== USUARIOS CON EMAILS ===' as info,
    au.email,
    us.subscription_type,
    us.status,
    us.user_id
FROM user_subscriptions us
INNER JOIN auth.users au ON us.user_id = au.id
WHERE us.status IN ('active', 'suspended', 'deleted')
ORDER BY 
    CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END,
    us.created_at DESC;

-- 4. Llamar la función directamente y ver qué devuelve
SELECT 
    '=== RESULTADO FUNCIÓN ADMIN ===' as info,
    get_all_subscriptions_admin() as function_result;

-- 5. Test manual de la lógica de la función
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
    AND us.status IN ('active', 'suspended', 'deleted')
    ORDER BY 
        CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END,
        us.created_at DESC
)
SELECT 
    '=== TEST MANUAL DE LA QUERY ===' as info,
    COUNT(*) as total_records,
    json_agg(
        json_build_object(
            'user_email', user_email,
            'status', status,
            'subscription_type', subscription_type
        )
    ) as sample_data
FROM user_data;