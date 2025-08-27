-- RESTAURAR ADMIN PARA jose241100@gmail.com
-- Ejecutar en Supabase SQL Editor

-- 1. Restaurar acceso de admin específicamente para tu email
UPDATE user_subscriptions 
SET 
  subscription_type = 'admin',
  status = 'active',
  updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'jose241100@gmail.com'
);

-- 2. Verificar que el cambio se aplicó correctamente
SELECT 
  au.id,
  au.email,
  us.subscription_type,
  us.status,
  us.updated_at
FROM auth.users au
JOIN user_subscriptions us ON au.id = us.user_id
WHERE au.email = 'jose241100@gmail.com';