-- DEBUG Y SOLUCIÓN DEFINITIVA
-- Ejecutar paso a paso para ver qué falla

-- PASO 1: Ver estado actual
SELECT 
    'ESTADO INICIAL' as paso,
    au.email,
    us.subscription_type,
    us.status,
    au.id as user_id
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY au.email;

-- PASO 2: Restaurar José como admin SIN tocar otros usuarios
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- PASO 3: Verificar que José es admin
SELECT 
    'DESPUÉS DE RESTAURAR JOSÉ' as paso,
    au.email,
    us.subscription_type,
    us.status
FROM auth.users au
JOIN user_subscriptions us ON au.id = us.user_id
WHERE au.email = 'jose241100@gmail.com';

-- PASO 4: Función de degradación ULTRA SIMPLE
CREATE OR REPLACE FUNCTION simple_degrade_user(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
    old_type TEXT;
    result_text TEXT;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Obtener datos del objetivo
    SELECT au.email, us.subscription_type 
    INTO target_email, old_type
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = target_user_id;
    
    -- Log inicial
    result_text := 'Intentando degradar: ' || COALESCE(target_email, 'EMAIL_UNKNOWN') || ' de ' || COALESCE(old_type, 'NO_SUBSCRIPTION') || ' a free';
    
    -- Protección: No tocar a José
    IF target_user_id = jose_id THEN
        RETURN 'ERROR: No se puede degradar a José (administrador principal)';
    END IF;
    
    -- Protección: No degradar otros admins  
    IF old_type = 'admin' THEN
        RETURN 'ERROR: No se puede degradar a otro administrador';
    END IF;
    
    -- Degradar SOLO al usuario objetivo
    UPDATE user_subscriptions 
    SET subscription_type = 'free', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Verificar que NO se tocó a José
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = jose_id 
        AND subscription_type = 'admin'
    ) THEN
        -- RESTAURAR a José inmediatamente si se dañó
        UPDATE user_subscriptions 
        SET subscription_type = 'admin', status = 'active', updated_at = NOW()
        WHERE user_id = jose_id;
        
        result_text := result_text || ' | ADVERTENCIA: José fue restaurado como admin automáticamente';
    END IF;
    
    RETURN result_text || ' | ÉXITO: Usuario degradado correctamente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Función admin simple
CREATE OR REPLACE FUNCTION check_if_admin()
RETURNS TEXT AS $$
DECLARE
    current_user_email TEXT;
    current_subscription TEXT;
BEGIN
    SELECT au.email, us.subscription_type
    INTO current_user_email, current_subscription
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = auth.uid();
    
    RETURN 'Usuario: ' || COALESCE(current_user_email, 'UNKNOWN') || 
           ' | Suscripción: ' || COALESCE(current_subscription, 'NONE') ||
           ' | Es admin: ' || CASE WHEN current_subscription = 'admin' THEN 'SÍ' ELSE 'NO' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: Dar permisos
GRANT EXECUTE ON FUNCTION simple_degrade_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_if_admin() TO authenticated;

-- PASO 7: Verificación final
SELECT 
    'ESTADO FINAL' as paso,
    au.email,
    us.subscription_type,
    us.status
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY 
    CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END,
    au.email;