-- Script para asegurar que el trigger funcione correctamente

-- 1. Verificar y recrear tablas si es necesario
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    auto_backup BOOLEAN DEFAULT true,
    backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
    currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    show_json_export BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    language TEXT DEFAULT 'es',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS income_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Eliminar función existente si existe
DROP FUNCTION IF EXISTS create_default_user_data();

-- 4. Recrear función con manejo de errores mejorado
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS trigger AS $$
BEGIN
    -- Log del inicio
    RAISE LOG 'Creando datos por defecto para usuario: %', NEW.id;
    
    BEGIN
        -- Crear configuración por defecto
        INSERT INTO user_settings (user_id) VALUES (NEW.id);
        RAISE LOG 'user_settings creado para usuario: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creando user_settings para %: %', NEW.id, SQLERRM;
    END;
    
    BEGIN
        -- Crear categorías por defecto
        INSERT INTO categories (user_id, name, color, sort_order) VALUES
            (NEW.id, 'Comida', '#FF6B6B', 1),
            (NEW.id, 'Transporte', '#4ECDC4', 2),
            (NEW.id, 'Entretenimiento', '#45B7D1', 3),
            (NEW.id, 'Servicios', '#96CEB4', 4),
            (NEW.id, 'Compras', '#FFEAA7', 5);
        RAISE LOG 'categories creadas para usuario: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creando categories para %: %', NEW.id, SQLERRM;
    END;
    
    BEGIN
        -- Crear métodos de pago por defecto
        INSERT INTO payment_methods (user_id, name, color, sort_order) VALUES
            (NEW.id, 'Efectivo', '#74B9FF', 1),
            (NEW.id, 'Tarjeta de Débito', '#0984E3', 2),
            (NEW.id, 'Tarjeta de Crédito', '#6C5CE7', 3),
            (NEW.id, 'Transferencia', '#A29BFE', 4);
        RAISE LOG 'payment_methods creados para usuario: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creando payment_methods para %: %', NEW.id, SQLERRM;
    END;
    
    BEGIN
        -- Crear tipos de ingresos por defecto
        INSERT INTO income_types (user_id, name, color, sort_order) VALUES
            (NEW.id, 'Salario Principal', '#00B894', 1),
            (NEW.id, 'Salario Secundario', '#00CEC9', 2),
            (NEW.id, 'Ingresos Adicionales', '#55A3FF', 3);
        RAISE LOG 'income_types creados para usuario: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error creando income_types para %: %', NEW.id, SQLERRM;
    END;
    
    RAISE LOG 'Datos por defecto creados exitosamente para usuario: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recrear trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_data();

-- 6. Habilitar RLS en las tablas
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas RLS básicas
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own payment_methods" ON payment_methods;
CREATE POLICY "Users can manage own payment_methods" ON payment_methods
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own income_types" ON income_types;
CREATE POLICY "Users can manage own income_types" ON income_types
    FOR ALL USING (auth.uid() = user_id);

-- 8. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos reparada exitosamente';
    RAISE NOTICE '📋 Tablas verificadas/creadas: user_settings, categories, payment_methods, income_types';
    RAISE NOTICE '🔧 Función recreada: create_default_user_data()';
    RAISE NOTICE '⚡ Trigger recreado: on_auth_user_created';
    RAISE NOTICE '🔒 Políticas RLS configuradas';
    RAISE NOTICE '🎉 Listo para crear nuevos usuarios';
END $$;