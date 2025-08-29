-- ====================================================================
-- SOLUCIÓN: Crear función RPC para reactivar usuario de forma segura
-- ====================================================================
-- Problema: Update directo puede fallar por campos inexistentes/permisos
-- Solución: Función RPC que solo actualiza campos que SÍ existen
-- ====================================================================

-- 1. Crear función RPC para reactivar usuario
CREATE OR REPLACE FUNCTION reactivate_user_admin(
    target_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    target_email TEXT;
    is_admin BOOLEAN;
    admin_user_id UUID;
    result JSON;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    admin_user_id := auth.uid();
    
    IF NOT is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No admin permissions'
        );
    END IF;
    
    -- Obtener email del usuario objetivo
    SELECT au.email INTO target_email 
    FROM auth.users au 
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- PROTECCIÓN: No tocar al admin principal
    IF target_email = 'jose241100@gmail.com' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No se puede modificar al administrador principal'
        );
    END IF;
    
    -- Reactivar usuario SOLO con campos que SÍ existen
    UPDATE user_subscriptions 
    SET 
        status = 'active',
        subscription_type = 'free',
        updated_at = NOW(),
        started_at = NOW(),
        expires_at = NULL,
        notes = 'Reactivado por administrador'
    WHERE user_id = target_user_id;
    
    -- Verificar que la actualización funcionó
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No se pudo actualizar el usuario'
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'message', 'Usuario ' || target_email || ' reactivado exitosamente',
        'user_email', target_email,
        'new_status', 'active',
        'new_subscription', 'free'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear función para deshabilitar usuario también
CREATE OR REPLACE FUNCTION disable_user_admin(
    target_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    target_email TEXT;
    is_admin BOOLEAN;
    admin_user_id UUID;
    result JSON;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    admin_user_id := auth.uid();
    
    IF NOT is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No admin permissions'
        );
    END IF;
    
    -- Obtener email del usuario objetivo
    SELECT au.email INTO target_email 
    FROM auth.users au 
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- PROTECCIÓN: No tocar al admin principal
    IF target_email = 'jose241100@gmail.com' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No se puede modificar al administrador principal'
        );
    END IF;
    
    -- Deshabilitar usuario
    UPDATE user_subscriptions 
    SET 
        status = 'deleted',
        updated_at = NOW(),
        notes = 'Deshabilitado por administrador'
    WHERE user_id = target_user_id;
    
    -- Verificar que la actualización funcionó
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No se pudo actualizar el usuario'
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'message', 'Usuario ' || target_email || ' deshabilitado exitosamente',
        'user_email', target_email,
        'new_status', 'deleted'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION reactivate_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_user_admin(UUID) TO authenticated;

-- 4. Test manual (ejecutar DESPUÉS de estar loggeado como José en la app)
-- SELECT reactivate_user_admin('12921eb5-29d2-4553-b605-f598921245a8'::UUID);

-- ====================================================================
-- PRÓXIMO PASO: Actualizar el frontend para usar estas funciones RPC
-- ====================================================================