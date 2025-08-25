-- Hacer a José administrador
UPDATE user_subscriptions 
SET subscription_type = 'admin',
    status = 'active',
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- Verificar que se aplicó el cambio
SELECT 
    u.email,
    us.subscription_type,
    us.status,
    'Should be admin/active' as expected
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jose241100@gmail.com';