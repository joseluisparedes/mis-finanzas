-- ==============================================
-- AGREGAR TABLA DE PRESUPUESTOS
-- Base de datos: PostgreSQL (Supabase)
-- ==============================================

-- ==============================================
-- 9. TABLA DE PRESUPUESTOS
-- ==============================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar presupuestos duplicados por categoría y período activos
    UNIQUE(user_id, category_id, period) DEFERRABLE INITIALLY DEFERRED
);

-- ==============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);

-- ==============================================
-- TRIGGER PARA UPDATED_AT
-- ==============================================
CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: Los usuarios solo pueden ver/editar sus propios presupuestos
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- FUNCIÓN PARA OBTENER PROGRESO DE PRESUPUESTO
-- ==============================================
CREATE OR REPLACE FUNCTION get_budget_progress(
    budget_uuid UUID,
    user_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    budget_record RECORD;
    start_date DATE;
    end_date DATE;
    spent_amount DECIMAL(15,2);
    percentage DECIMAL(5,2);
    result JSON;
BEGIN
    -- Obtener información del presupuesto
    SELECT * INTO budget_record 
    FROM budgets 
    WHERE id = budget_uuid AND user_id = user_uuid AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Budget not found');
    END IF;
    
    -- Calcular período según el tipo
    CASE budget_record.period
        WHEN 'weekly' THEN
            start_date := date_trunc('week', CURRENT_DATE);
            end_date := start_date + INTERVAL '6 days';
        WHEN 'monthly' THEN
            start_date := date_trunc('month', CURRENT_DATE);
            end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;
        WHEN 'yearly' THEN
            start_date := date_trunc('year', CURRENT_DATE);
            end_date := (start_date + INTERVAL '1 year - 1 day')::DATE;
    END CASE;
    
    -- Calcular gastos del período
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM expenses 
    WHERE user_id = user_uuid 
    AND category_id = budget_record.category_id
    AND date >= start_date 
    AND date <= end_date;
    
    -- Calcular porcentaje
    percentage := CASE 
        WHEN budget_record.amount > 0 THEN 
            ROUND((spent_amount / budget_record.amount * 100)::numeric, 2)
        ELSE 0 
    END;
    
    -- Construir resultado
    SELECT json_build_object(
        'budget_id', budget_record.id,
        'category_id', budget_record.category_id,
        'amount', budget_record.amount,
        'period', budget_record.period,
        'spent', spent_amount,
        'percentage', percentage,
        'remaining', budget_record.amount - spent_amount,
        'start_date', start_date,
        'end_date', end_date,
        'is_over_budget', spent_amount > budget_record.amount
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==============================================
COMMENT ON TABLE budgets IS 'Presupuestos por categoría configurados por el usuario';
COMMENT ON FUNCTION get_budget_progress IS 'Calcula el progreso de un presupuesto específico para el período actual';

-- ==============================================
-- ACTUALIZACIÓN DEL ESQUEMA PRINCIPAL
-- ==============================================
-- Este script debe ejecutarse en Supabase SQL Editor
-- para agregar la funcionalidad de presupuestos