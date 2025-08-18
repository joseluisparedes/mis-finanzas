-- Script completo para finalizar la configuración de Supabase (versión corregida)
-- Crear todas las tablas faltantes y configuraciones sin conflictos

-- 1. Crear tabla de gastos (expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE RESTRICT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de ingresos (incomes)
CREATE TABLE IF NOT EXISTS incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    income_type_id UUID REFERENCES income_types(id) ON DELETE RESTRICT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de backups de usuario
CREATE TABLE IF NOT EXISTS user_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    backup_data JSONB NOT NULL,
    backup_type TEXT DEFAULT 'manual' CHECK (backup_type IN ('manual', 'automatic')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method_id ON expenses(payment_method_id);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_income_type_id ON incomes(income_type_id);

CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_created_at ON user_backups(created_at);

-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para tablas
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own incomes" ON incomes;
CREATE POLICY "Users can manage own incomes" ON incomes
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own backups" ON user_backups;
CREATE POLICY "Users can manage own backups" ON user_backups
    FOR ALL USING (auth.uid() = user_id);

-- 7. Crear función para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear triggers para updated_at en tablas existentes
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_types_updated_at ON income_types;
CREATE TRIGGER update_income_types_updated_at
    BEFORE UPDATE ON income_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Crear triggers para updated_at en tablas nuevas
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incomes_updated_at ON incomes;
CREATE TRIGGER update_incomes_updated_at
    BEFORE UPDATE ON incomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Crear vista para estadísticas por categoría (sin RLS)
DROP VIEW IF EXISTS user_category_stats;
CREATE VIEW user_category_stats AS
SELECT 
    c.user_id,
    c.id as category_id,
    c.name as category_name,
    c.color,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COUNT(e.id) as transaction_count,
    COALESCE(AVG(e.amount), 0) as average_amount
FROM categories c
LEFT JOIN expenses e ON c.id = e.category_id
GROUP BY c.user_id, c.id, c.name, c.color;

-- 11. Verificar que las tablas principales existen
DO $$
BEGIN
    -- Verificar user_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        RAISE EXCEPTION 'Tabla user_settings no existe. Ejecuta primero fix-database-trigger.sql';
    END IF;
    
    -- Verificar categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
        RAISE EXCEPTION 'Tabla categories no existe. Ejecuta primero fix-database-trigger.sql';
    END IF;
    
    -- Verificar payment_methods
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        RAISE EXCEPTION 'Tabla payment_methods no existe. Ejecuta primero fix-database-trigger.sql';
    END IF;
    
    -- Verificar income_types
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income_types') THEN
        RAISE EXCEPTION 'Tabla income_types no existe. Ejecuta primero fix-database-trigger.sql';
    END IF;
END $$;

-- 12. Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '🎉 CONFIGURACIÓN DE SUPABASE COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📊 Tablas creadas: expenses, incomes, user_backups';
    RAISE NOTICE '🔍 Índices creados para mejor rendimiento';
    RAISE NOTICE '🔒 Políticas RLS configuradas en todas las tablas';
    RAISE NOTICE '⚡ Triggers de updated_at configurados';
    RAISE NOTICE '📋 Vista user_category_stats creada';
    RAISE NOTICE '✅ Ahora ejecuta: fix-function-conflict.sql';
    RAISE NOTICE '🚀 Base de datos lista para la aplicación';
END $$;