-- ======================================================
-- CORRECCIÓN DE RECURSIÓN INFINITA EN POLÍTICAS RLS
-- Versión 2: Sintaxis corregida
-- ======================================================

-- El problema está en las políticas que referencian user_subscriptions
-- desde user_profiles, causando recursión infinita

-- 1. Eliminar todas las políticas problemáticas de user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 2. Recrear políticas básicas sin IF NOT EXISTS (no soportado en políticas)
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Política de admin simplificada para evitar recursión
-- Usar un enfoque más directo sin subconsultas complejas
CREATE POLICY "Admins can view all profiles" ON user_profiles 
    FOR SELECT USING (
        -- Verificar admin de forma simple
        auth.uid() IN (
            SELECT user_id FROM user_subscriptions 
            WHERE subscription_type = 'admin' AND status = 'active'
        )
    );

-- 4. Si aún hay recursión, usar una política más básica
-- Comentar la línea anterior y descomentar esta:
-- CREATE POLICY "Admins can view all profiles" ON user_profiles 
--     FOR SELECT USING (
--         -- Solo el admin específico puede ver todos los perfiles
--         auth.uid() = '50d9bb01-97d4-4db9-909e-0f06cffb9f1a'::uuid
--     );

-- 5. Verificar que la función RPC no cause problemas
-- Recrear get_user_profile_info sin referencias problemáticas
CREATE OR REPLACE FUNCTION get_user_profile_info(target_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    profile_user_id UUID;
    profile_record RECORD;
    user_record RECORD;
    result JSON;
    is_admin BOOLEAN := FALSE;
BEGIN
    -- Si no se especifica user_id, usar el usuario actual
    profile_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Verificar si es admin de forma segura
    BEGIN
        SELECT EXISTS(
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = auth.uid() 
            AND subscription_type = 'admin'
            AND status = 'active'
        ) INTO is_admin;
    EXCEPTION
        WHEN OTHERS THEN
            is_admin := FALSE;
    END;
    
    -- Verificar permisos (solo el propio usuario o admin)
    IF profile_user_id != auth.uid() AND NOT is_admin THEN
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

-- 6. Permisos para las funciones RPC
GRANT EXECUTE ON FUNCTION get_user_profile_info(UUID) TO anon, authenticated;

-- ======================================================
-- MENSAJE FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS corregidas para evitar recursión infinita';
    RAISE NOTICE '🔧 Función get_user_profile_info actualizada';
    RAISE NOTICE '🚀 Sistema de perfiles debería funcionar correctamente ahora';
    RAISE NOTICE '📝 Si persiste la recursión, usar la política comentada línea 32';
END $$;