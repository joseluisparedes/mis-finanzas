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

-- PASO 1: Corregir constraint de métodos de pago
-- Esto permite crear métodos con el mismo nombre si el anterior está inactivo
DROP INDEX IF EXISTS payment_methods_user_id_name_active_idx;
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_user_id_name_key;

CREATE UNIQUE INDEX payment_methods_user_id_name_active_idx 
ON payment_methods (user_id, name) 
WHERE is_active = true;

-- PASO 2: Verificar configuración de zona horaria
SELECT name, setting, unit, category 
FROM pg_settings 
WHERE name IN ('timezone', 'log_timezone', 'TimeZone');

-- PASO 3: Mostrar últimas inserciones para verificar fechas
SELECT 
    id,
    date,
    created_at,
    description,
    amount
FROM expenses 
WHERE created_at >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY created_at DESC
LIMIT 10;

-- =======================================================================
-- VALIDACIÓN: Después de ejecutar, intenta crear un método de pago 
-- con el mismo nombre de uno que hayas borrado antes. Debería funcionar.
-- =======================================================================