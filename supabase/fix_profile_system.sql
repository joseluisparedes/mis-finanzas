-- ======================================================
-- CORRECCIÓN PARA SISTEMA DE PERFILES PERSONALIZADOS
-- Incluye: limpieza de funciones y reinstalación completa
-- ======================================================

-- 1. Eliminar funciones existentes que pueden tener conflictos de tipo
DROP FUNCTION IF EXISTS get_all_subscriptions();
DROP FUNCTION IF EXISTS get_user_profile_info(UUID);

-- 2. Crear tabla user_profiles si no existe
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Información del perfil
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT 'person-1',
    avatar_color TEXT DEFAULT '#8B5CF6',
    
    -- Preferencias adicionales
    theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'America/Lima',
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice único por usuario
    UNIQUE(user_id)
);

-- 3. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Nuevas políticas RLS
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON user_profiles 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- 6. Función para obtener todas las suscripciones CON PERFILES
CREATE FUNCTION get_all_subscriptions()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    subscription_type TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    price_paid DECIMAL,
    billing_period TEXT,
    is_early_bird BOOLEAN,
    early_bird_price DECIMAL,
    notes TEXT,
    created_at TIMESTAMPTZ,
    users JSONB,
    profile JSONB
) AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions us_check
        WHERE us_check.user_id = auth.uid() AND us_check.subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        us.id,
        us.user_id,
        us.subscription_type,
        us.status,
        us.started_at,
        us.expires_at,
        us.price_paid,
        us.billing_period,
        us.is_early_bird,
        us.early_bird_price,
        us.notes,
        us.created_at,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'created_at', u.created_at
        ) as users,
        COALESCE(
            jsonb_build_object(
                'display_name', up.display_name,
                'avatar', up.avatar,
                'avatar_color', up.avatar_color
            ),
            '{}'::jsonb
        ) as profile
    FROM user_subscriptions us
    LEFT JOIN auth.users u ON us.user_id = u.id
    LEFT JOIN user_profiles up ON us.user_id = up.user_id
    ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener perfil completo del usuario
CREATE FUNCTION get_user_profile_info(target_user_id UUID DEFAULT NULL)
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

-- 8. Actualizar trigger de creación de usuario para incluir perfil por defecto
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

-- 9. Recriar el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_data();

-- 10. Permisos para las funciones RPC
GRANT EXECUTE ON FUNCTION get_all_subscriptions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_info(UUID) TO anon, authenticated;

-- ======================================================
-- MENSAJE FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de perfiles personalizado corregido e instalado completamente';
    RAISE NOTICE '👤 Los usuarios pueden personalizar: nombre, avatar y color';
    RAISE NOTICE '🎨 Avatares incluyen: personas, profesiones, animales, naturaleza y objetos';
    RAISE NOTICE '🔧 Funciones RPC actualizadas para incluir datos de perfil';
    RAISE NOTICE '🚀 El sistema está listo para usar';
END $$;