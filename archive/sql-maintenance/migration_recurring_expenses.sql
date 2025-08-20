-- ==============================================
-- MIGRACIÓN: Agregar tabla de gastos recurrentes
-- ==============================================

-- 1. Crear tabla de gastos recurrentes
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'PEN',
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON recurring_expenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_category ON recurring_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_date ON recurring_expenses(next_date);

-- 3. Trigger para updated_at
CREATE TRIGGER update_recurring_expenses_updated_at 
    BEFORE UPDATE ON recurring_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad
CREATE POLICY "Users can view own recurring_expenses" 
    ON recurring_expenses FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring_expenses" 
    ON recurring_expenses FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring_expenses" 
    ON recurring_expenses FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring_expenses" 
    ON recurring_expenses FOR DELETE 
    USING (auth.uid() = user_id);

-- 6. Comentario para documentación
COMMENT ON TABLE recurring_expenses IS 'Gastos recurrentes configurados por el usuario';