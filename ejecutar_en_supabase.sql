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