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

-- PASO 4: Probar las funciones con fecha de hoy
SELECT create_expense_with_date(
    'debe-ser-tu-user-id'::UUID,
    'alguna-category-id'::UUID,
    'algun-payment-method-id'::UUID,
    100.50,
    'Prueba de fecha',
    '2025-08-18',
    'Nota de prueba'
);

-- =======================================================================
-- VALIDACIÓN: Después de ejecutar, las fechas deberían guardarse correctamente
-- usando p_date_str::DATE que fuerza interpretación como fecha local
-- =======================================================================