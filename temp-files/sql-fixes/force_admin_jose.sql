-- FORZAR ADMIN PARA JOSÉ - MÉTODO DIRECTO
-- Ejecutar en Supabase SQL Editor

-- 1. Mostrar todos los usuarios para identificar cuál eres
SELECT 
  au.id,
  au.email,
  au.created_at,
  us.subscription_type,
  us.status
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY au.created_at;

-- 2. Forzar admin para jose241100@gmail.com específicamente
UPDATE user_subscriptions 
SET 
  subscription_type = 'admin',
  status = 'active',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'jose241100@gmail.com'
);

-- 3. Si no existe la suscripción, crearla
INSERT INTO user_subscriptions (
  user_id,
  subscription_type,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'jose241100@gmail.com'
AND id NOT IN (SELECT user_id FROM user_subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_type = 'admin',
  status = 'active',
  updated_at = NOW();

-- 4. Verificar resultado
SELECT 
  au.email,
  us.subscription_type,
  us.status,
  'ESTE DEBE SER ADMIN' as nota
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'jose241100@gmail.com';

-- 5. Mostrar todos los admins
SELECT 
  au.email,
  us.subscription_type,
  us.status
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE us.subscription_type = 'admin';