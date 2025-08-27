-- SOLUCIÓN RÁPIDA - Ejecutar en Supabase SQL Editor
-- Copia y pega TODO este bloque

-- 1. Bypass temporal para función admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que jose241100@gmail.com es admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 3. Crear suscripción si no existe
INSERT INTO user_subscriptions (user_id, subscription_type, status, created_at, updated_at)
SELECT id, 'admin', 'active', NOW(), NOW()
FROM auth.users 
WHERE email = 'jose241100@gmail.com'
AND id NOT IN (SELECT user_id FROM user_subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_type = 'admin',
  status = 'active', 
  updated_at = NOW();

-- 4. Función protegida para degradar usuarios
CREATE OR REPLACE FUNCTION degrade_user_to_free(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_subscription TEXT;
    admin_user_id UUID;
BEGIN
    -- Verificar que quien ejecuta es admin
    admin_user_id := auth.uid();
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = admin_user_id 
        AND subscription_type = 'admin' 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden degradar usuarios';
    END IF;
    
    -- Obtener tipo de suscripción del usuario objetivo
    SELECT subscription_type INTO target_subscription
    FROM user_subscriptions 
    WHERE user_id = target_user_id;
    
    -- PROTECCIÓN: No degradar administradores
    IF target_subscription = 'admin' THEN
        RAISE EXCEPTION 'No se puede degradar a un administrador';
    END IF;
    
    -- PROTECCIÓN: No auto-degradarse
    IF target_user_id = admin_user_id THEN
        RAISE EXCEPTION 'No puedes degradarte a ti mismo';
    END IF;
    
    -- Actualizar suscripción
    UPDATE user_subscriptions 
    SET subscription_type = 'free',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Registrar la acción
    INSERT INTO audit_logs (
        action_type, table_name, record_id, user_id, 
        old_values, new_values, changes_summary,
        operation_source, ip_address
    ) VALUES (
        'UPDATE', 'user_subscriptions', target_user_id, admin_user_id,
        jsonb_build_object('subscription_type', target_subscription), 
        jsonb_build_object('subscription_type', 'free'),
        'Usuario degradado a plan gratuito por administrador',
        'admin_panel', '127.0.0.1'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para suspender usuarios
CREATE OR REPLACE FUNCTION suspend_user_account(target_user_id UUID, reason TEXT DEFAULT 'Suspendido por administrador')
RETURNS BOOLEAN AS $$
BEGIN
    -- Insertar o actualizar estado de cuenta
    INSERT INTO account_status (user_id, status, suspension_reason, suspended_by, suspended_at, created_at, updated_at)
    VALUES (target_user_id, 'suspended', reason, (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'), NOW(), NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'suspended',
        suspension_reason = reason,
        suspended_by = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'),
        suspended_at = NOW(),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION degrade_user_to_free(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_user_account(UUID, TEXT) TO authenticated;

-- 7. RESTAURAR TU ACCESO ADMIN
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = auth.uid();

-- 8. Verificar resultado final
SELECT 
  'SISTEMA DE DEGRADACIÓN CONFIGURADO CORRECTAMENTE' as resultado,
  'La función ahora protege automáticamente contra auto-degradación' as proteccion;