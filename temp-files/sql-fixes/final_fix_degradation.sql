-- SOLUCIÓN FINAL PARA DEGRADACIÓN SIN PROBLEMAS
-- Ejecutar TODO en Supabase SQL Editor

-- 1. Función simple y directa para degradar
CREATE OR REPLACE FUNCTION degrade_user_to_free(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_email TEXT;
    jose_user_id UUID;
BEGIN
    -- Obtener email del usuario objetivo
    SELECT email INTO target_email 
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Obtener ID de José
    SELECT id INTO jose_user_id 
    FROM auth.users 
    WHERE email = 'jose241100@gmail.com';
    
    -- BLOQUEAR si intentan degradar a José
    IF target_user_id = jose_user_id THEN
        RAISE EXCEPTION 'No se puede degradar al administrador principal';
    END IF;
    
    -- BLOQUEAR si el objetivo es admin
    IF EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = target_user_id 
        AND subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'No se puede degradar a otro administrador';
    END IF;
    
    -- DEGRADAR ÚNICAMENTE AL USUARIO OBJETIVO
    UPDATE user_subscriptions 
    SET subscription_type = 'free'
    WHERE user_id = target_user_id;
    
    -- VERIFICAR que se realizó el cambio
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado o no se pudo degradar';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función admin limpia que funciona
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar si el usuario actual es José
    IF auth.uid() = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com') THEN
        RETURN true;
    END IF;
    
    -- Para otros usuarios, verificar suscripción
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() 
        AND subscription_type = 'admin' 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ASEGURAR que José es admin SIEMPRE
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 4. Si no existe, crear la suscripción
INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at, updated_at)
SELECT id, 'admin', 'active', NOW(), NOW()
FROM auth.users 
WHERE email = 'jose241100@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com')
);

-- 5. Permisos
GRANT EXECUTE ON FUNCTION degrade_user_to_free(UUID) TO authenticated;

-- 6. TEST: Crear un usuario de prueba premium para degradar
-- (Solo si no existe)
INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at, updated_at)
SELECT 
    (SELECT id FROM auth.users WHERE email != 'jose241100@gmail.com' LIMIT 1),
    'premium_monthly',
    'active',
    NOW(),
    NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email != 'jose241100@gmail.com')
AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = (SELECT id FROM auth.users WHERE email != 'jose241100@gmail.com' LIMIT 1)
);

-- 7. Verificar resultado
SELECT 
    'José restaurado como admin permanente' as resultado,
    'Función de degradación lista para usar' as estado;