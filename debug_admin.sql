-- ==============================================
-- DEBUG: Verificar y corregir usuario ADMIN
-- ==============================================

-- 1. Verificar si tu usuario existe en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'jose241100@gmail.com';

-- 2. Verificar si tienes entrada en user_subscriptions
SELECT 
  us.*
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'jose241100@gmail.com';

-- 3. Si NO tienes entrada en user_subscriptions, crearla manualmente:
INSERT INTO user_subscriptions (
  user_id, 
  subscription_type, 
  status
) 
SELECT 
  id,
  'admin',
  'active'
FROM auth.users 
WHERE email = 'jose241100@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM user_subscriptions us 
  WHERE us.user_id = auth.users.id
);

-- 4. Si YA tienes entrada, actualizarla a admin:
UPDATE user_subscriptions 
SET 
  subscription_type = 'admin',
  status = 'active',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'
);

-- 5. Aplicar límites de admin (ilimitado)
SELECT set_subscription_limits(
  'admin', 
  (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com')
);

-- 6. Verificar que funcionó
SELECT 
  u.email,
  us.subscription_type,
  us.status,
  us.monthly_transaction_limit,
  us.budget_limit,
  us.multi_currency_enabled,
  us.excel_export_enabled,
  us.advanced_reports_enabled
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jose241100@gmail.com';

-- 7. Contar usuarios por tipo (debe mostrar 1 admin ahora)
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
FROM user_subscriptions;