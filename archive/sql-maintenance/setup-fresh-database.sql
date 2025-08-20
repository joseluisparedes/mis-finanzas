-- ==============================================
-- SCRIPT COMPLETO: RESET + SETUP FRESCO
-- Este script elimina todo y recrea la BD desde cero
-- ==============================================

-- PASO 1: RESETEAR TODO
-- ==============================================

-- 1. ELIMINAR TRIGGERS PRIMERO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS update_income_types_updated_at ON income_types;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS update_incomes_updated_at ON incomes;

-- 2. ELIMINAR POLÍTICAS RLS
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

DROP POLICY IF EXISTS "Users can view own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment_methods" ON payment_methods;

DROP POLICY IF EXISTS "Users can view own income_types" ON income_types;
DROP POLICY IF EXISTS "Users can insert own income_types" ON income_types;
DROP POLICY IF EXISTS "Users can update own income_types" ON income_types;
DROP POLICY IF EXISTS "Users can delete own income_types" ON income_types;

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete own incomes" ON incomes;

DROP POLICY IF EXISTS "Users can view own backups" ON user_backups;
DROP POLICY IF EXISTS "Users can insert own backups" ON user_backups;
DROP POLICY IF EXISTS "Users can delete own backups" ON user_backups;

-- 3. ELIMINAR ÍNDICES
DROP INDEX IF EXISTS idx_expenses_user_date;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_payment_method;
DROP INDEX IF EXISTS idx_incomes_user_date;
DROP INDEX IF EXISTS idx_incomes_type;
DROP INDEX IF EXISTS idx_categories_user;
DROP INDEX IF EXISTS idx_payment_methods_user;
DROP INDEX IF EXISTS idx_income_types_user;
DROP INDEX IF EXISTS idx_expenses_description;
DROP INDEX IF EXISTS idx_incomes_description;

-- 4. ELIMINAR TABLAS
DROP TABLE IF EXISTS user_backups CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS incomes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS income_types CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- 5. ELIMINAR FUNCIONES
DROP FUNCTION IF EXISTS get_financial_summary(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS create_default_user_data();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- PASO 2: RECREAR DESDE CERO
-- ==============================================

-- Habilitar RLS (Row Level Security) para todas las tablas
ALTER DATABASE postgres SET timezone TO 'UTC';

-- ==============================================
-- 1. TABLA DE CONFIGURACIONES DE USUARIO
-- ==============================================
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    auto_backup BOOLEAN DEFAULT true,
    backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'manual')),
    currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    show_json_export BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ==============================================
-- 2. TABLA DE CATEGORÍAS DE GASTOS
-- ==============================================
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF6B6B',
    icon TEXT DEFAULT 'circle',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- ==============================================
-- 3. TABLA DE MÉTODOS DE PAGO
-- ==============================================
CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#74B9FF',
    icon TEXT DEFAULT 'credit-card',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- ==============================================
-- 4. TABLA DE TIPOS DE INGRESOS
-- ==============================================
CREATE TABLE income_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#00B894',
    icon TEXT DEFAULT 'dollar-sign',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- ==============================================
-- 5. TABLA DE GASTOS
-- ==============================================
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    tags TEXT[],
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 6. TABLA DE INGRESOS
-- ==============================================
CREATE TABLE incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    income_type_id UUID REFERENCES income_types(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    tags TEXT[],
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 7. TABLA DE BACKUPS (OPCIONAL)
-- ==============================================
CREATE TABLE user_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    backup_data JSONB NOT NULL,
    backup_type TEXT DEFAULT 'manual' CHECK (backup_type IN ('manual', 'automatic')),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==============================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_payment_method ON expenses(payment_method_id);

CREATE INDEX idx_incomes_user_date ON incomes(user_id, date DESC);
CREATE INDEX idx_incomes_type ON incomes(income_type_id);

CREATE INDEX idx_categories_user ON categories(user_id, is_active);
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id, is_active);
CREATE INDEX idx_income_types_user ON income_types(user_id, is_active);

-- Índices para búsquedas por texto
CREATE INDEX idx_expenses_description ON expenses USING gin(to_tsvector('spanish', description));
CREATE INDEX idx_incomes_description ON incomes USING gin(to_tsvector('spanish', description));

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_types_updated_at BEFORE UPDATE ON income_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incomes_updated_at BEFORE UPDATE ON incomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: Los usuarios solo pueden ver/editar sus propios datos
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment_methods" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment_methods" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment_methods" ON payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment_methods" ON payment_methods FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own income_types" ON income_types FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income_types" ON income_types FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income_types" ON income_types FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income_types" ON income_types FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own incomes" ON incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own incomes" ON incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incomes" ON incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own incomes" ON incomes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own backups" ON user_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backups" ON user_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own backups" ON user_backups FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- FUNCIONES DE UTILIDAD
-- ==============================================

-- Función para obtener resumen financiero
CREATE OR REPLACE FUNCTION get_financial_summary(
    user_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH expense_summary AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total_expenses,
            COUNT(*) as expense_count
        FROM expenses 
        WHERE user_id = user_uuid
        AND (start_date IS NULL OR date >= start_date)
        AND (end_date IS NULL OR date <= end_date)
    ),
    income_summary AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total_incomes,
            COUNT(*) as income_count
        FROM incomes 
        WHERE user_id = user_uuid
        AND (start_date IS NULL OR date >= start_date)
        AND (end_date IS NULL OR date <= end_date)
    )
    SELECT json_build_object(
        'total_expenses', e.total_expenses,
        'total_incomes', i.total_incomes,
        'balance', i.total_incomes - e.total_expenses,
        'expense_count', e.expense_count,
        'income_count', i.income_count,
        'savings_rate', CASE 
            WHEN i.total_incomes > 0 THEN 
                ROUND(((i.total_incomes - e.total_expenses) / i.total_incomes * 100)::numeric, 2)
            ELSE 0 
        END
    ) INTO result
    FROM expense_summary e, income_summary i;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DATOS INICIALES POR DEFECTO
-- ==============================================

-- Función para crear datos iniciales al registrarse un usuario
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear configuración por defecto
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    
    -- Crear categorías por defecto
    INSERT INTO categories (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Comida', '#FF6B6B', 1),
        (NEW.id, 'Transporte', '#4ECDC4', 2),
        (NEW.id, 'Entretenimiento', '#45B7D1', 3),
        (NEW.id, 'Servicios', '#96CEB4', 4),
        (NEW.id, 'Compras', '#FFEAA7', 5);
    
    -- Crear métodos de pago por defecto
    INSERT INTO payment_methods (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Efectivo', '#74B9FF', 1),
        (NEW.id, 'Tarjeta de Débito', '#0984E3', 2),
        (NEW.id, 'Tarjeta de Crédito', '#6C5CE7', 3),
        (NEW.id, 'Transferencia', '#A29BFE', 4);
    
    -- Crear tipos de ingresos por defecto
    INSERT INTO income_types (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Salario Principal', '#00B894', 1),
        (NEW.id, 'Salario Secundario', '#00CEC9', 2),
        (NEW.id, 'Ingresos Adicionales', '#55A3FF', 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear datos por defecto al registrar usuario
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_data();

-- ==============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==============================================

COMMENT ON TABLE user_settings IS 'Configuraciones personalizadas por usuario';
COMMENT ON TABLE categories IS 'Categorías de gastos personalizadas por usuario';
COMMENT ON TABLE payment_methods IS 'Métodos de pago personalizados por usuario';
COMMENT ON TABLE income_types IS 'Tipos de ingresos personalizados por usuario';
COMMENT ON TABLE expenses IS 'Registros de gastos del usuario';
COMMENT ON TABLE incomes IS 'Registros de ingresos del usuario';
COMMENT ON TABLE user_backups IS 'Backups de datos del usuario en formato JSON';

COMMENT ON FUNCTION get_financial_summary IS 'Obtiene resumen financiero para un período específico';
COMMENT ON FUNCTION create_default_user_data IS 'Crea datos iniciales cuando se registra un nuevo usuario';

-- ==============================================
-- MENSAJE FINAL
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '🎉 BASE DE DATOS CONFIGURADA EXITOSAMENTE';
    RAISE NOTICE '📊 Todas las tablas, índices, triggers y políticas creadas';
    RAISE NOTICE '🔒 Row Level Security habilitado';
    RAISE NOTICE '✅ Listo para usar con tu aplicación';
END $$;