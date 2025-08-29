-- Verificar status actual del usuario específico
SELECT 
    '=== STATUS ACTUAL DEL USUARIO ===' as info,
    au.email,
    us.status,
    us.subscription_type,
    us.updated_at,
    us.notes
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'contacto.laesquinadelshopper@gmail.com';

-- Ver el registro de actualizaciones recientes
SELECT 
    '=== ACTUALIZACIONES RECIENTES ===' as info,
    au.email,
    us.status,
    us.updated_at
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE us.updated_at >= NOW() - INTERVAL '10 minutes'
ORDER BY us.updated_at DESC;