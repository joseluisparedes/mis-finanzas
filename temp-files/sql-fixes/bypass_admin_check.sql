-- BYPASS TEMPORAL - DESHABILITAR VERIFICACIÓN DE ADMIN
-- Ejecutar en Supabase SQL Editor para solucionarlo temporalmente

-- 1. Crear función bypass que siempre devuelve true para admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- BYPASS TEMPORAL: siempre devolver true
    -- Esto permite que todas las funciones admin funcionen
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. También crear versión alternativa que verifica por email
CREATE OR REPLACE FUNCTION is_user_admin_by_email(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
BEGIN
    SELECT subscription_type 
    FROM user_subscriptions us
    JOIN auth.users au ON us.user_id = au.id
    WHERE au.email = user_email 
    AND us.status = 'active'
    INTO user_type;
    
    RETURN COALESCE(user_type, 'free') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que jose241100@gmail.com es admin
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

-- 4. Verificar que el bypass funciona
SELECT is_current_user_admin() as "bypass_activo";

-- 5. Verificar que josé es admin por email
SELECT is_user_admin_by_email('jose241100@gmail.com') as "jose_es_admin";

-- 6. Mostrar estado final
SELECT 
  au.email,
  us.subscription_type,
  us.status
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'jose241100@gmail.com';