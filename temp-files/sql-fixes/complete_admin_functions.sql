-- FUNCIONES RPC SEGURAS PARA TODAS LAS OPERACIONES ADMIN
-- Ejecutar TODO en Supabase SQL Editor

-- 1. RESTAURAR JOSÉ COMO ADMIN PRIMERO
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 2. FUNCIÓN PARA PROMOVER A PREMIUM (segura)
CREATE OR REPLACE FUNCTION safe_promote_to_premium(target_user_id UUID, payment_info JSONB DEFAULT '{}'::jsonb)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
    old_subscription TEXT;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Obtener datos del usuario objetivo
    SELECT au.email, us.subscription_type
    INTO target_email, old_subscription
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario no encontrado';
    END IF;
    
    -- PROTECCIÓN: No tocar a José
    IF target_user_id = jose_id THEN
        RETURN 'BLOQUEADO: No se puede cambiar la suscripción del administrador principal';
    END IF;
    
    -- Promover a premium
    UPDATE user_subscriptions 
    SET subscription_type = 'premium_monthly',
        status = 'active',
        price_paid = COALESCE((payment_info->>'amount')::decimal, 15.00),
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::boolean THEN 5.00 
            ELSE NULL 
        END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Verificar que José sigue siendo admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = jose_id AND subscription_type = 'admin'
    ) THEN
        UPDATE user_subscriptions 
        SET subscription_type = 'admin', status = 'active', updated_at = NOW()
        WHERE user_id = jose_id;
    END IF;
    
    RETURN 'ÉXITO: ' || target_email || ' promovido de ' || 
           COALESCE(old_subscription, 'sin_suscripcion') || ' a premium';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN PARA PROMOVER A ADMIN (segura)
CREATE OR REPLACE FUNCTION safe_promote_to_admin(target_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    jose_id UUID;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Obtener ID del usuario objetivo
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_user_email;
    
    IF target_user_id IS NULL THEN
        RETURN 'ERROR: Usuario con email ' || target_user_email || ' no encontrado';
    END IF;
    
    -- PROTECCIÓN: Solo José puede promover a admin
    IF auth.uid() != jose_id THEN
        RETURN 'BLOQUEADO: Solo el administrador principal puede crear otros administradores';
    END IF;
    
    -- Promover a admin
    UPDATE user_subscriptions 
    SET subscription_type = 'admin', status = 'active', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at, updated_at)
        VALUES (target_user_id, 'admin', 'active', NOW(), NOW());
    END IF;
    
    RETURN 'ÉXITO: ' || target_user_email || ' promovido a administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN PARA SUSPENDER USUARIO (segura)
CREATE OR REPLACE FUNCTION safe_suspend_user(target_user_id UUID, reason TEXT DEFAULT 'Suspendido por administrador')
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
BEGIN
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario no encontrado';
    END IF;
    
    -- PROTECCIÓN: No suspender a José
    IF target_user_id = jose_id THEN
        RETURN 'BLOQUEADO: No se puede suspender al administrador principal';
    END IF;
    
    -- Suspender usuario
    UPDATE user_subscriptions 
    SET status = 'suspended', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Crear registro en account_status si existe la tabla
    INSERT INTO account_status (user_id, status, suspension_reason, suspended_by, suspended_at, created_at, updated_at)
    VALUES (target_user_id, 'suspended', reason, jose_id, NOW(), NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'suspended',
        suspension_reason = reason,
        suspended_by = jose_id,
        suspended_at = NOW(),
        updated_at = NOW();
    
    RETURN 'ÉXITO: Usuario ' || target_email || ' suspendido. Razón: ' || reason;
EXCEPTION WHEN OTHERS THEN
    RETURN 'ÉXITO: Usuario ' || target_email || ' suspendido (sin tabla account_status)';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN PARA RESTAURAR USUARIO (segura)
CREATE OR REPLACE FUNCTION safe_restore_user(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
BEGIN
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario no encontrado';
    END IF;
    
    -- Restaurar usuario
    UPDATE user_subscriptions 
    SET status = 'active', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Actualizar account_status si existe
    UPDATE account_status 
    SET status = 'active', updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RETURN 'ÉXITO: Usuario ' || target_email || ' restaurado y activado';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ÉXITO: Usuario ' || target_email || ' restaurado (sin tabla account_status)';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PERMISOS PARA TODAS LAS FUNCIONES
GRANT EXECUTE ON FUNCTION safe_promote_to_premium(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_restore_user(UUID) TO authenticated;

-- 7. VERIFICAR QUE JOSÉ ES ADMIN
SELECT 'JOSÉ VERIFICADO COMO ADMIN' as resultado;
SELECT verify_admin_status() as estado_actual;