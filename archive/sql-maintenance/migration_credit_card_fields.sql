-- ==============================================
-- MIGRACIÓN: Agregar campos de tarjeta de crédito a métodos de pago
-- ==============================================

-- 1. Agregar nuevas columnas para tarjetas de crédito (solo si no existen)
DO $$ 
BEGIN
    -- Agregar payment_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE payment_methods 
        ADD COLUMN payment_type TEXT DEFAULT 'cash' CHECK (payment_type IN ('cash', 'credit_card'));
    END IF;

    -- Agregar cc_closing_day si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' AND column_name = 'cc_closing_day'
    ) THEN
        ALTER TABLE payment_methods 
        ADD COLUMN cc_closing_day INTEGER CHECK (cc_closing_day BETWEEN 1 AND 31);
    END IF;

    -- Agregar cc_payment_day si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_methods' AND column_name = 'cc_payment_day'
    ) THEN
        ALTER TABLE payment_methods 
        ADD COLUMN cc_payment_day INTEGER CHECK (cc_payment_day BETWEEN 1 AND 31);
    END IF;
END $$;

-- 2. Agregar constraint para validar campos de TC (solo si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_cc_fields' 
        AND conrelid = 'payment_methods'::regclass
    ) THEN
        ALTER TABLE payment_methods 
        ADD CONSTRAINT check_cc_fields CHECK (
            (payment_type = 'cash' AND cc_closing_day IS NULL AND cc_payment_day IS NULL) OR
            (payment_type = 'credit_card' AND cc_closing_day IS NOT NULL AND cc_payment_day IS NOT NULL)
        );
    END IF;
END $$;

-- 3. Actualizar métodos existentes a 'cash' (como solicita el usuario)
UPDATE payment_methods 
SET payment_type = 'cash' 
WHERE payment_type IS NULL;

-- 4. Comentarios para documentación
COMMENT ON COLUMN payment_methods.payment_type IS 'Tipo de método: cash (efectivo) o credit_card (tarjeta de crédito)';
COMMENT ON COLUMN payment_methods.cc_closing_day IS 'Día de cierre de la tarjeta de crédito (1-31)';
COMMENT ON COLUMN payment_methods.cc_payment_day IS 'Día límite de pago de la tarjeta de crédito (1-31)';