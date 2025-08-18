-- Script para resolver el conflicto de la función get_financial_summary

-- 1. Eliminar función existente si existe
DROP FUNCTION IF EXISTS get_financial_summary(uuid,date,date);
DROP FUNCTION IF EXISTS get_financial_summary(uuid);
DROP FUNCTION IF EXISTS get_financial_summary();

-- 2. Crear la función con la firma correcta
CREATE OR REPLACE FUNCTION get_financial_summary(
    user_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_expenses DECIMAL,
    total_incomes DECIMAL,
    balance DECIMAL,
    expense_count BIGINT,
    income_count BIGINT,
    savings_rate DECIMAL,
    average_expense DECIMAL,
    average_income DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH expense_data AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total_exp,
            COUNT(*) as count_exp,
            COALESCE(AVG(amount), 0) as avg_exp
        FROM expenses 
        WHERE user_id = user_uuid
        AND (start_date IS NULL OR date >= start_date)
        AND (end_date IS NULL OR date <= end_date)
    ),
    income_data AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total_inc,
            COUNT(*) as count_inc,
            COALESCE(AVG(amount), 0) as avg_inc
        FROM incomes 
        WHERE user_id = user_uuid
        AND (start_date IS NULL OR date >= start_date)
        AND (end_date IS NULL OR date <= end_date)
    )
    SELECT 
        ed.total_exp,
        id.total_inc,
        id.total_inc - ed.total_exp as balance,
        ed.count_exp,
        id.count_inc,
        CASE 
            WHEN id.total_inc > 0 THEN ((id.total_inc - ed.total_exp) / id.total_inc * 100)
            ELSE 0 
        END as savings_rate,
        ed.avg_exp,
        id.avg_inc
    FROM expense_data ed, income_data id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Función get_financial_summary recreada exitosamente';
    RAISE NOTICE '📊 Parámetros: user_uuid, start_date (opcional), end_date (opcional)';
    RAISE NOTICE '🔧 Listo para usar en la aplicación';
END $$;