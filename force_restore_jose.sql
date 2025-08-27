-- RESTAURAR JOSÉ ESPECÍFICAMENTE - MÉTODO DIRECTO
-- Ejecutar en Supabase SQL Editor

-- 1. Restaurar josé directamente por email
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 2. Si no existe la suscripción, crearla
INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at, updated_at)
SELECT id, 'admin', 'active', NOW(), NOW()
FROM auth.users 
WHERE email = 'jose241100@gmail.com'
AND id NOT IN (SELECT user_id FROM user_subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_type = 'admin',
  status = 'active',
  updated_at = NOW();

-- 3. Función admin que funciona
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
    user_email TEXT;
BEGIN
    -- Obtener email del usuario actual
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- Si es josé, devolver true directamente
    IF user_email = 'jose241100@gmail.com' THEN
        RETURN true;
    END IF;
    
    -- Para otros usuarios, verificar normalmente
    SELECT subscription_type 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    INTO user_type;
    
    RETURN COALESCE(user_type, 'free') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función de degradación que NUNCA toca a josé
CREATE OR REPLACE FUNCTION degrade_user_to_free(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_email TEXT;
    target_subscription TEXT;
    admin_user_id UUID;
BEGIN
    -- Obtener email del usuario objetivo
    SELECT email INTO target_email 
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- NUNCA tocar a josé
    IF target_email = 'jose241100@gmail.com' THEN
        RAISE EXCEPTION 'Operación bloqueada: No se puede degradar al administrador principal';
    END IF;
    
    -- Obtener ID de josé (administrador principal)
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'jose241100@gmail.com';
    
    -- Verificar que josé es quien ejecuta
    IF auth.uid() != admin_user_id THEN
        RAISE EXCEPTION 'Solo el administrador principal puede degradar usuarios';
    END IF;
    
    -- Obtener suscripción del objetivo
    SELECT subscription_type INTO target_subscription
    FROM user_subscriptions 
    WHERE user_id = target_user_id;
    
    -- No degradar otros admins
    IF target_subscription = 'admin' AND target_email != 'jose241100@gmail.com' THEN
        RAISE EXCEPTION 'No se puede degradar a otro administrador';
    END IF;
    
    -- Degradar usuario objetivo
    UPDATE user_subscriptions 
    SET subscription_type = 'free',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- GARANTIZAR que josé sigue siendo admin
    UPDATE user_subscriptions 
    SET subscription_type = 'admin', status = 'active', updated_at = NOW()
    WHERE user_id = admin_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Permisos
GRANT EXECUTE ON FUNCTION degrade_user_to_free(UUID) TO authenticated;

-- 6. Verificar que josé es admin
SELECT 
    au.email,
    us.subscription_type,
    us.status,
    au.id,
    'JOSÉ DEBE SER ADMIN' as resultado
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'jose241100@gmail.com';