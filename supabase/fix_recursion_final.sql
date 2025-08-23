-- ======================================================
-- CORRECCIÓN FINAL: Eliminar recursión infinita completamente
-- ======================================================

-- El problema persiste porque las políticas aún referencian user_subscriptions
-- Vamos a usar un enfoque más drástico y seguro

-- 1. ELIMINAR TODAS las políticas de user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 2. Recrear SOLO las políticas básicas sin referencias a user_subscriptions
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. NO crear política de admin por ahora para evitar recursión
-- Los admins pueden acceder a través de funciones RPC directamente

-- 4. Función alternativa para obtener perfil sin políticas problemáticas
CREATE OR REPLACE FUNCTION get_user_profile_simple(target_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    profile_user_id UUID;
    profile_record RECORD;
    user_record RECORD;
    result JSON;
BEGIN
    -- Si no se especifica user_id, usar el usuario actual
    profile_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Solo permitir ver el propio perfil por ahora
    IF profile_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only view own profile';
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

-- 5. Verificar que la tabla existe y está accesible
DO $$
BEGIN
    -- Verificar que la tabla user_profiles existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE '⚠️ Tabla user_profiles no existe, creándola...';
        
        CREATE TABLE user_profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            display_name TEXT NOT NULL,
            avatar TEXT DEFAULT 'person-1',
            avatar_color TEXT DEFAULT '#8B5CF6',
            theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
            language TEXT DEFAULT 'es',
            timezone TEXT DEFAULT 'America/Lima',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        -- Habilitar RLS
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Crear índice
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
        
        RAISE NOTICE '✅ Tabla user_profiles creada exitosamente';
    ELSE
        RAISE NOTICE '✅ Tabla user_profiles ya existe';
    END IF;
END $$;

-- 6. Permisos para las funciones
GRANT EXECUTE ON FUNCTION get_user_profile_simple(UUID) TO anon, authenticated;

-- 7. Trigger para updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================================
-- MENSAJE FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de perfiles configurado SIN recursión infinita';
    RAISE NOTICE '🔒 Solo políticas básicas habilitadas (sin admin por ahora)';
    RAISE NOTICE '📱 Función get_user_profile_simple disponible';
    RAISE NOTICE '🚀 El sistema debería funcionar correctamente ahora';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NOTA: Los admins no pueden ver otros perfiles por ahora';
    RAISE NOTICE '   Esto se puede habilitar después que funcione básicamente';
END $$;