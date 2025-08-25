-- ==============================================
-- CONFIGURACIÓN INICIAL: Promover usuario a ADMIN
-- EJECUTAR EN SUPABASE SQL EDITOR DESPUÉS DE add_user_subscriptions.sql
-- ==============================================

-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_EMAIL@gmail.com' con tu email real
-- 2. Ejecuta este script en Supabase SQL Editor
-- 3. Tu usuario será promovido a ADMIN automáticamente

-- Promover usuario a ADMIN (REEMPLAZA EL EMAIL)
SELECT promote_user_to_admin('TU_EMAIL@gmail.com');

-- Verificar que funcionó (debería mostrar success: true)
-- Si no existe el usuario, mostrará error: "Usuario no encontrado"

-- OPCIONAL: Ver todos los usuarios y sus roles
SELECT 
  u.email,
  us.subscription_type,
  us.status,
  us.is_early_bird,
  us.created_at
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
ORDER BY us.created_at DESC;

-- OPCIONAL: Ver estadísticas del sistema
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
FROM user_subscriptions;