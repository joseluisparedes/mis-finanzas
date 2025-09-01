-- Agregar campo de celular a la tabla user_profiles para administradores
-- Permitir que los administradores puedan editar y gestionar números telefónicos

-- 1. Agregar campo de celular
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Función RPC para que administradores actualicen el celular de usuarios
CREATE OR REPLACE FUNCTION admin_update_user_phone(
    target_user_id UUID,
    new_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    affected_rows INTEGER;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Validar formato básico del teléfono (opcional)
    IF new_phone_number IS NOT NULL AND LENGTH(TRIM(new_phone_number)) > 0 THEN
        -- Remover espacios y validar que contenga solo números, +, -, (, )
        IF NOT (TRIM(new_phone_number) ~ '^[\+\-\(\)\d\s]+$') THEN
            RAISE EXCEPTION 'Invalid phone number format';
        END IF;
    END IF;
    
    -- Actualizar o insertar perfil con número de teléfono
    INSERT INTO user_profiles (user_id, display_name, phone_number)
    VALUES (
        target_user_id, 
        COALESCE((SELECT email FROM auth.users WHERE id = target_user_id), ''),
        TRIM(new_phone_number)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        phone_number = TRIM(EXCLUDED.phone_number),
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Phone number updated for user %s', target_user_id),
        'affected_rows', affected_rows,
        'new_phone_number', TRIM(new_phone_number)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para obtener información de contacto de usuarios (para admins)
CREATE OR REPLACE FUNCTION get_user_contact_info_admin(target_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    user_info RECORD;
    profile_info RECORD;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Si no se especifica usuario, obtener todos
    IF target_user_id IS NULL THEN
        -- Para este caso, usar otra función que retorne array
        RAISE EXCEPTION 'Use get_all_users_contact_info_admin() for all users';
    END IF;
    
    -- Obtener información del usuario
    SELECT * INTO user_info 
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Obtener información del perfil
    SELECT * INTO profile_info
    FROM user_profiles 
    WHERE user_id = target_user_id;
    
    RETURN json_build_object(
        'user_id', target_user_id,
        'email', user_info.email,
        'display_name', COALESCE(profile_info.display_name, user_info.email),
        'phone_number', profile_info.phone_number,
        'avatar', COALESCE(profile_info.avatar, 'person-1'),
        'avatar_color', COALESCE(profile_info.avatar_color, '#8B5CF6'),
        'user_created_at', user_info.created_at,
        'profile_updated_at', profile_info.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para obtener todos los usuarios con información de contacto
CREATE OR REPLACE FUNCTION get_all_users_contact_info_admin()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    display_name TEXT,
    phone_number TEXT,
    avatar TEXT,
    avatar_color TEXT,
    subscription_type TEXT,
    status TEXT,
    user_created_at TIMESTAMPTZ,
    profile_updated_at TIMESTAMPTZ
) AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (us.subscription_type = 'admin' OR us.is_admin = true) FROM user_subscriptions us
    WHERE us.user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Retornar todos los usuarios con información de contacto
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        COALESCE(up.display_name, au.email) as display_name,
        up.phone_number,
        COALESCE(up.avatar, 'person-1') as avatar,
        COALESCE(up.avatar_color, '#8B5CF6') as avatar_color,
        COALESCE(us.subscription_type, 'free') as subscription_type,
        COALESCE(us.status, 'active') as status,
        au.created_at as user_created_at,
        up.updated_at as profile_updated_at
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.user_id
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.deleted_at IS NULL  -- Excluir usuarios eliminados
    ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar función existente get_user_profile_info para incluir teléfono
CREATE OR REPLACE FUNCTION get_user_profile_info(target_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    profile_user_id UUID;
    profile_record RECORD;
    user_record RECORD;
    result JSON;
BEGIN
    -- Si no se especifica user_id, usar el usuario actual
    profile_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Verificar permisos (solo el propio usuario o admin)
    IF profile_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND (subscription_type = 'admin' OR is_admin = true)
    ) THEN
        RAISE EXCEPTION 'Access denied: Cannot view other user profiles';
    END IF;
    
    -- Obtener información del usuario de auth.users
    SELECT * INTO user_record 
    FROM auth.users 
    WHERE id = profile_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Obtener perfil personalizado
    SELECT * INTO profile_record 
    FROM user_profiles 
    WHERE user_id = profile_user_id;
    
    -- Construir respuesta
    SELECT json_build_object(
        'user_id', profile_user_id,
        'email', user_record.email,
        'display_name', COALESCE(
            profile_record.display_name, 
            user_record.raw_user_meta_data->>'display_name',
            split_part(user_record.email, '@', 1)
        ),
        'phone_number', profile_record.phone_number,
        'avatar', COALESCE(profile_record.avatar, 'person-1'),
        'avatar_color', COALESCE(profile_record.avatar_color, '#8B5CF6'),
        'theme_preference', COALESCE(profile_record.theme_preference, 'system'),
        'language', COALESCE(profile_record.language, 'es'),
        'timezone', COALESCE(profile_record.timezone, 'America/Lima'),
        'profile_created_at', profile_record.created_at,
        'profile_updated_at', profile_record.updated_at,
        'user_created_at', user_record.created_at
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION admin_update_user_phone(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_contact_info_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_contact_info_admin() TO authenticated;

-- 7. Comentarios
COMMENT ON COLUMN user_profiles.phone_number IS 'Número de teléfono/celular del usuario, editable por administradores';
COMMENT ON FUNCTION admin_update_user_phone IS 'Permite a administradores actualizar el número telefónico de usuarios';
COMMENT ON FUNCTION get_all_users_contact_info_admin IS 'Obtiene información de contacto de todos los usuarios para administradores';

-- 8. Mensaje de confirmación
SELECT 'Phone number field added successfully!' as result;
SELECT 'Admins can now edit user phone numbers via admin_update_user_phone() function' as functionality;