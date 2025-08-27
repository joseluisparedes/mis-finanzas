-- SOLUCIÓN ATÓMICA: DEGRADACIÓN SIN AFECTAR ADMIN
-- Ejecutar TODO en Supabase SQL Editor

-- 1. Función de degradación completamente atómica
CREATE OR REPLACE FUNCTION safe_degrade_user(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
    old_subscription TEXT;
    result_msg TEXT;
BEGIN
    -- Obtener ID de José al inicio
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Si no encontramos a José, error crítico
    IF jose_id IS NULL THEN
        RETURN 'ERROR CRÍTICO: No se encontró al administrador principal josé';
    END IF;
    
    -- Obtener datos del usuario objetivo
    SELECT au.email, us.subscription_type
    INTO target_email, old_subscription
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = target_user_id;
    
    -- Si no se encontró el usuario
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario objetivo no encontrado';
    END IF;
    
    -- PROTECCIÓN: Nunca tocar a José
    IF target_user_id = jose_id THEN
        RETURN 'BLOQUEADO: No se puede degradar al administrador principal ' || target_email;
    END IF;
    
    -- PROTECCIÓN: No degradar otros admins
    IF old_subscription = 'admin' THEN
        RETURN 'BLOQUEADO: No se puede degradar a otro administrador ' || target_email;
    END IF;
    
    -- OPERACIÓN ATÓMICA: Solo modificar al usuario objetivo
    BEGIN
        -- Verificar que José es admin ANTES de la operación
        IF NOT EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = jose_id AND subscription_type = 'admin' AND status = 'active'
        ) THEN
            -- Restaurar a José primero
            UPDATE user_subscriptions 
            SET subscription_type = 'admin', status = 'active', updated_at = NOW()
            WHERE user_id = jose_id;
        END IF;
        
        -- Degradar ÚNICAMENTE al usuario objetivo
        UPDATE user_subscriptions 
        SET subscription_type = 'free', status = 'active', updated_at = NOW()
        WHERE user_id = target_user_id;
        
        -- Verificar que la degradación funcionó
        IF NOT FOUND THEN
            RETURN 'ERROR: No se pudo actualizar la suscripción del usuario ' || target_email;
        END IF;
        
        -- VERIFICAR que José sigue siendo admin DESPUÉS de la operación
        IF NOT EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = jose_id AND subscription_type = 'admin' AND status = 'active'
        ) THEN
            -- RESTAURAR a José automáticamente
            UPDATE user_subscriptions 
            SET subscription_type = 'admin', status = 'active', updated_at = NOW()
            WHERE user_id = jose_id;
            
            result_msg := 'ÉXITO CON RESTAURACIÓN: ' || target_email || ' degradado de ' || 
                         COALESCE(old_subscription, 'sin_suscripcion') || ' a free. José restaurado automáticamente.';
        ELSE
            result_msg := 'ÉXITO: ' || target_email || ' degradado de ' || 
                         COALESCE(old_subscription, 'sin_suscripcion') || ' a free. José mantiene admin.';
        END IF;
        
        RETURN result_msg;
        
    EXCEPTION WHEN OTHERS THEN
        -- En caso de cualquier error, restaurar a José
        UPDATE user_subscriptions 
        SET subscription_type = 'admin', status = 'active', updated_at = NOW()
        WHERE user_id = jose_id;
        
        RETURN 'ERROR EN OPERACIÓN: ' || SQLERRM || ' | José restaurado por seguridad';
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que José es admin antes de cualquier operación
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 3. Función simple para verificar admin
CREATE OR REPLACE FUNCTION verify_admin_status()
RETURNS TEXT AS $$
DECLARE
    jose_status TEXT;
    total_admins INT;
BEGIN
    -- Verificar estado de José
    SELECT subscription_type INTO jose_status
    FROM user_subscriptions
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');
    
    -- Contar total de admins
    SELECT COUNT(*) INTO total_admins
    FROM user_subscriptions
    WHERE subscription_type = 'admin' AND status = 'active';
    
    RETURN 'José: ' || COALESCE(jose_status, 'SIN_SUSCRIPCION') || 
           ' | Total admins activos: ' || total_admins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Dar permisos
GRANT EXECUTE ON FUNCTION safe_degrade_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_status() TO authenticated;

-- 5. Verificación inicial
SELECT verify_admin_status() as estado_inicial;

-- 6. Mostrar todos los usuarios para referencia
SELECT 
    'USUARIOS ACTUALES' as info,
    au.email,
    us.subscription_type,
    us.status,
    au.id
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY 
    CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END,
    us.subscription_type DESC,
    au.email;