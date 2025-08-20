-- ==============================================
-- SCRIPT DE LIMPIEZA: Métodos de pago duplicados
-- ==============================================

-- 1. Identificar métodos de pago duplicados por usuario
SELECT 
    user_id, 
    name, 
    COUNT(*) as cantidad,
    STRING_AGG(id::text, ', ') as ids
FROM payment_methods 
GROUP BY user_id, name 
HAVING COUNT(*) > 1
ORDER BY user_id, name;

-- 2. Ver todos los métodos de pago que causan el constraint (para debug)
-- Descomenta las siguientes líneas si necesitas ver todos los registros duplicados:
-- SELECT id, user_id, name, created_at, payment_type, cc_closing_day, cc_payment_day
-- FROM payment_methods 
-- WHERE (user_id, name) IN (
--     SELECT user_id, name 
--     FROM payment_methods 
--     GROUP BY user_id, name 
--     HAVING COUNT(*) > 1
-- )
-- ORDER BY user_id, name, created_at;

-- 3. Limpieza: Mantener solo el registro más reciente de cada duplicado
-- ADVERTENCIA: Este script eliminará datos. Ejecutar solo si estás seguro.
-- 
-- DELETE FROM payment_methods 
-- WHERE id IN (
--     SELECT id 
--     FROM (
--         SELECT id, 
--                ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at DESC) as rn
--         FROM payment_methods
--     ) t 
--     WHERE rn > 1
-- );

-- 4. Verificación después de la limpieza
-- SELECT COUNT(*) as total_payment_methods FROM payment_methods;
-- SELECT user_id, COUNT(*) as cantidad_por_usuario 
-- FROM payment_methods 
-- GROUP BY user_id;