-- =======================================================================
-- INSTRUCCIONES PARA EJECUTAR EN SUPABASE SQL EDITOR
-- =======================================================================
-- 
-- 1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Abre el "SQL Editor" 
-- 3. Copia y pega los siguientes comandos uno por uno
-- 4. Ejecuta cada comando con Ctrl+Enter o el botón "Run"
--
-- =======================================================================

-- PASO 1: Crear función para insertar gastos con fecha correcta
CREATE OR REPLACE FUNCTION create_expense_with_date(
    p_user_id UUID,
    p_category_id UUID,
    p_payment_method_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_date_str TEXT,
    p_notes TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}',
    p_is_recurring BOOLEAN DEFAULT FALSE,
    p_recurring_frequency TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, user_id UUID, date DATE) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO expenses (
        user_id, category_id, payment_method_id, amount, 
        description, date, notes, tags, is_recurring, recurring_frequency
    ) VALUES (
        p_user_id, p_category_id, p_payment_method_id, p_amount,
        p_description, p_date_str::DATE, p_notes, p_tags, p_is_recurring, p_recurring_frequency
    )
    RETURNING expenses.id, expenses.user_id, expenses.date;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Crear función para insertar ingresos con fecha correcta
CREATE OR REPLACE FUNCTION create_income_with_date(
    p_user_id UUID,
    p_income_type_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_date_str TEXT,
    p_notes TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}',
    p_is_recurring BOOLEAN DEFAULT FALSE,
    p_recurring_frequency TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, user_id UUID, date DATE) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO incomes (
        user_id, income_type_id, amount, 
        description, date, notes, tags, is_recurring, recurring_frequency
    ) VALUES (
        p_user_id, p_income_type_id, p_amount,
        p_description, p_date_str::DATE, p_notes, p_tags, p_is_recurring, p_recurring_frequency
    )
    RETURNING incomes.id, incomes.user_id, incomes.date;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Verificar configuración de zona horaria
SELECT name, setting, unit, category 
FROM pg_settings 
WHERE name IN ('timezone', 'log_timezone', 'TimeZone');

-- PASO 4: Ver último registro insertado
SELECT 
    id,
    description,
    amount,
    date,
    created_at,
    created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima' as created_at_lima
FROM expenses 
ORDER BY created_at DESC
LIMIT 3;

-- PASO 5: Ver configuración de zona horaria actual
SHOW timezone;

-- PASO 6: Ver cómo PostgreSQL interpreta la fecha '2025-08-18'
SELECT 
    '2025-08-18'::DATE as fecha_como_date,
    '2025-08-18T12:00:00-05:00'::TIMESTAMPTZ as fecha_con_timezone,
    CURRENT_DATE as fecha_actual_server,
    NOW() as timestamp_actual_server;

-- =======================================================================
-- DIAGNÓSTICO: Ejecuta estos comandos para ver exactamente qué está pasando
-- Si ves que date = '2025-08-17' entonces el problema persiste
-- =======================================================================

-- =======================================================================
-- NUEVAS FUNCIONALIDADES: SALARY_DAY E INGRESOS RECURRENTES
-- =======================================================================

-- PASO 7: Agregar salary_day a la tabla user_settings existente
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS salary_day INTEGER DEFAULT 28;

-- PASO 7B: Agregar exchange_rate a la tabla user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 3.8000;

-- PASO 8: Modificar tabla recurring_expenses para incluir ingresos recurrentes
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income'));

-- PASO 9: Agregar columna para referenciar income_type en recurring_expenses (para ingresos recurrentes)
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS income_type_id UUID REFERENCES income_types(id);

-- PASO 10: Actualizar constraint para que sea flexible con category_id e income_type_id
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_category_id_fkey;
ALTER TABLE recurring_expenses ALTER COLUMN category_id DROP NOT NULL;

-- PASO 11: Agregar constraint para validar que tenga category_id O income_type_id según el tipo
ALTER TABLE recurring_expenses ADD CONSTRAINT check_category_or_income_type 
CHECK (
    (transaction_type = 'expense' AND category_id IS NOT NULL AND income_type_id IS NULL) OR
    (transaction_type = 'income' AND income_type_id IS NOT NULL AND category_id IS NULL)
);

-- PASO 12: Re-agregar la foreign key constraint para category_id
ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id);

-- PASO 13: Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'recurring_expenses' 
ORDER BY ordinal_position;

-- PASO 14: Verificar user_settings actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
ORDER BY ordinal_position;

-- PASO 15: Verificar que salary_day y exchange_rate se agregaron correctamente
SELECT 'Campos salary_day y exchange_rate agregados correctamente' as status,
       COUNT(*) as usuarios_existentes
FROM user_settings;

-- PASO 16: Verificar estructura completa de user_settings
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name IN ('salary_day', 'exchange_rate')
ORDER BY column_name;