-- EMERGENCIA: REPARAR FUNCIÓN ADMIN SIN BYPASS
-- Ejecutar INMEDIATAMENTE

-- 1. Restaurar función admin CORRECTA (sin bypass)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
BEGIN
    -- Obtener tipo de suscripción del usuario actual
    SELECT subscription_type 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    INTO user_type;
    
    -- Devolver si es admin
    RETURN COALESCE(user_type, 'free') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que tu usuario ES admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = auth.uid();

-- 3. Función de degradación MEJORADA
CREATE OR REPLACE FUNCTION degrade_user_to_free(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_subscription TEXT;
    current_user_id UUID;
    current_is_admin BOOLEAN;
BEGIN
    -- Obtener ID del usuario actual
    current_user_id := auth.uid();
    
    -- Verificar que el usuario actual es admin ANTES de hacer nada
    SELECT (subscription_type = 'admin' AND status = 'active')
    INTO current_is_admin
    FROM user_subscriptions 
    WHERE user_id = current_user_id;
    
    IF NOT COALESCE(current_is_admin, false) THEN
        RAISE EXCEPTION 'Solo administradores pueden degradar usuarios';
    END IF;
    
    -- Obtener suscripción del objetivo
    SELECT subscription_type INTO target_subscription
    FROM user_subscriptions 
    WHERE user_id = target_user_id;
    
    -- No degradar administradores
    IF target_subscription = 'admin' THEN
        RAISE EXCEPTION 'No se puede degradar a un administrador';
    END IF;
    
    -- No auto-degradarse
    IF target_user_id = current_user_id THEN
        RAISE EXCEPTION 'No puedes degradarte a ti mismo';
    END IF;
    
    -- DEGRADAR solo al objetivo
    UPDATE user_subscriptions 
    SET subscription_type = 'free',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- ASEGURAR que el admin actual sigue siendo admin
    UPDATE user_subscriptions 
    SET subscription_type = 'admin', status = 'active', updated_at = NOW()
    WHERE user_id = current_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permisos
GRANT EXECUTE ON FUNCTION degrade_user_to_free(UUID) TO authenticated;

-- 5. Verificar que eres admin
SELECT 
    auth.uid() as tu_id,
    us.subscription_type,
    us.status,
    'VERIFICAR QUE ERES ADMIN' as resultado
FROM user_subscriptions us
WHERE us.user_id = auth.uid();