-- DIAGNÓSTICO: Verificar qué componentes faltan para las nuevas funcionalidades
-- Ejecutar en Supabase SQL Editor para ver el estado actual

-- 1. Verificar si las funciones RPC existen
SELECT 
  routine_name as function_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_users_detailed_admin',
    'suspend_user_account', 
    'restore_user_account',
    'delete_user_account',
    'get_user_complete_data',
    'get_system_stats_admin'
  );

-- 2. Verificar si las tablas de auditoría existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'audit_logs',
    'user_sessions',
    'account_status'
  );

-- 3. Verificar tu rol de usuario actual
SELECT 
  id,
  email,
  subscription_type,
  status,
  is_admin,
  created_at
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'tu_email@example.com'; -- Cambiar por tu email

-- 4. Si no ves resultados en la consulta anterior, verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;