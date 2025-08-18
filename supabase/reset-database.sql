-- ==============================================
-- SCRIPT PARA RESETEAR COMPLETAMENTE LA BASE DE DATOS
-- CUIDADO: Esto ELIMINARÁ TODOS LOS DATOS
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

-- 4. ELIMINAR TABLAS (en orden correcto por dependencias)
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

-- ==============================================
-- MENSAJE DE CONFIRMACIÓN
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos reseteada completamente';
    RAISE NOTICE '📝 Ejecuta ahora el archivo schema.sql para recrear las tablas';
    RAISE NOTICE '⚠️  TODOS LOS DATOS HAN SIDO ELIMINADOS';
END $$;