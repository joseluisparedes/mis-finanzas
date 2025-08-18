-- ==============================================
-- SCRIPT: Arreglar constraint de métodos de pago
-- ==============================================
-- Este script modifica el constraint único para permitir nombres duplicados 
-- cuando el método de pago anterior está inactivo (is_active = false)

-- 1. Verificar el constraint actual
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'payment_methods'::regclass 
  AND conname LIKE '%name%';

-- 2. Eliminar el constraint único actual
ALTER TABLE payment_methods 
DROP CONSTRAINT IF EXISTS payment_methods_user_id_name_key;

-- 3. Crear un índice único parcial que solo considera registros activos
-- Esto permite nombres duplicados si el registro anterior está inactivo
CREATE UNIQUE INDEX payment_methods_user_id_name_active_idx 
ON payment_methods (user_id, name) 
WHERE is_active = true;

-- 4. Verificar que el nuevo índice fue creado correctamente
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'payment_methods' 
  AND indexname = 'payment_methods_user_id_name_active_idx';

-- 5. Verificar que podemos insertar métodos con nombres duplicados si están inactivos
-- (Esto es solo para testing - no ejecutar en producción)
-- 
-- INSERT INTO payment_methods (user_id, name, is_active, color, payment_type) 
-- VALUES 
--   ('test-user', 'Test Method', false, '#FF0000', 'cash'),
--   ('test-user', 'Test Method', true, '#00FF00', 'cash');
--
-- SELECT * FROM payment_methods WHERE user_id = 'test-user' AND name = 'Test Method';
-- 
-- DELETE FROM payment_methods WHERE user_id = 'test-user' AND name = 'Test Method';