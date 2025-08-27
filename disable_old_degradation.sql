-- DESHABILITAR SISTEMA VIEJO DE DEGRADACIÓN
-- Ejecutar para evitar conflictos

-- 1. RESTAURAR JOSÉ INMEDIATAMENTE
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 2. Verificar estado de José
SELECT 
    'Estado actual de José:' as info,
    au.email,
    us.subscription_type,
    us.status
FROM auth.users au
JOIN user_subscriptions us ON au.id = us.user_id
WHERE au.email = 'jose241100@gmail.com';

-- 3. Ver quién realmente se degradó
SELECT 
    'USUARIOS DESPUÉS DEL ÚLTIMO CAMBIO:' as info,
    au.email,
    us.subscription_type,
    us.status,
    au.id
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY us.updated_at DESC;

-- 4. Restaurar el usuario que se degradó por error si era premium
UPDATE user_subscriptions 
SET subscription_type = 'premium', status = 'active', updated_at = NOW()
WHERE user_id = 'ad733270-4009-48d1-a276-1085e358b465'
AND subscription_type = 'free';

-- 5. Verificar estado final
SELECT 
    'ESTADO FINAL CORREGIDO:' as info,
    au.email,
    us.subscription_type,
    us.status
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
WHERE au.id IN (
    (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'),
    'ad733270-4009-48d1-a276-1085e358b465'::uuid
);