-- ======================================================
-- TABLA PARA PERFILES PERSONALIZADOS DE USUARIO
-- ======================================================

-- 1. Crear tabla user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Información del perfil
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'person-1',
    avatar_color TEXT DEFAULT '#8B5CF6',
    
    -- Preferencias adicionales (para futuras mejoras)
    theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Lima',
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice único por usuario
    UNIQUE(user_id)
);

-- 2. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 3. Trigger para updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Los usuarios solo pueden ver, crear y actualizar su propio perfil
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON user_profiles 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- 5. Función para obtener perfil completo del usuario
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
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
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

-- 6. Permisos para la función
GRANT EXECUTE ON FUNCTION get_user_profile_info(UUID) TO anon, authenticated;

-- 7. Actualizar el trigger de creación de usuario para incluir perfil por defecto
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        -- Crear suscripción FREE por defecto
        INSERT INTO user_subscriptions (user_id, subscription_type, status) 
        VALUES (NEW.id, 'free', 'active');
        
        RAISE LOG 'Default subscription created for user: %', NEW.id;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'Subscription already exists for user: %', NEW.id;
        WHEN OTHERS THEN
            RAISE LOG 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    END;
    
    BEGIN
        -- Crear perfil por defecto
        INSERT INTO user_profiles (
            user_id, 
            display_name, 
            avatar, 
            avatar_color
        ) VALUES (
            NEW.id, 
            COALESCE(
                NEW.raw_user_meta_data->>'display_name',
                split_part(NEW.email, '@', 1)
            ),
            'person-1',
            '#8B5CF6'
        );
        
        RAISE LOG 'Default profile created for user: %', NEW.id;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'Profile already exists for user: %', NEW.id;
        WHEN OTHERS THEN
            RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Intentar crear user_settings si la tabla existe
    BEGIN
        INSERT INTO user_settings (user_id) VALUES (NEW.id);
        RAISE LOG 'User settings created for user: %', NEW.id;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE LOG 'user_settings table does not exist, skipping';
        WHEN unique_violation THEN
            RAISE LOG 'User settings already exist for user: %', NEW.id;
        WHEN OTHERS THEN
            RAISE LOG 'Error creating user settings for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================
-- COMENTARIOS Y MENSAJE FINAL
-- ======================================================
COMMENT ON TABLE user_profiles IS 'Perfiles personalizados de usuarios con avatares y preferencias';
COMMENT ON FUNCTION get_user_profile_info IS 'Obtiene información completa del perfil de usuario';

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla user_profiles creada exitosamente';
    RAISE NOTICE '👤 Los usuarios pueden personalizar: nombre, avatar, color y preferencias';
    RAISE NOTICE '🎨 Avatares incluyen: personas diversas, profesiones, animales, naturaleza y objetos';
END $$;