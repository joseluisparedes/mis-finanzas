-- FIX COMPLETO PARA JOSÉ - jose241100@gmail.com
-- Ejecutar TODO este bloque en Supabase SQL Editor

-- 1. Restaurar admin para jose241100@gmail.com específicamente
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

-- 2. Recrear la función is_current_user_admin para evitar problemas de caché
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
    current_email TEXT;
BEGIN
    -- Obtener email y tipo de suscripción
    SELECT us.subscription_type, au.email
    FROM user_subscriptions us
    JOIN auth.users au ON us.user_id = au.id
    WHERE us.user_id = auth.uid() 
    AND us.status = 'active'
    INTO user_type, current_email;
    
    -- Log para debugging
    RAISE NOTICE 'Usuario actual ID: %, Email: %, Tipo: %', auth.uid(), current_email, user_type;
    
    -- Verificar si es admin
    RETURN COALESCE(user_type, 'free') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que todo funciona correctamente
SELECT 
  is_current_user_admin() as "soy_admin",
  auth.uid() as "mi_id",
  au.email as "mi_email",
  us.subscription_type as "mi_tipo"
FROM auth.users au
JOIN user_subscriptions us ON au.id = us.user_id
WHERE au.id = auth.uid();

-- 4. Mostrar todos los admins para verificar
SELECT 
  au.email,
  us.subscription_type,
  us.status,
  us.updated_at
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE us.subscription_type = 'admin';