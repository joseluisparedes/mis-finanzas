-- VERIFICAR CONSTRAINS DE SUBSCRIPTION_TYPE
-- Ejecutar para ver qué valores están permitidos

-- 1. Ver los constraints de la tabla user_subscriptions
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'user_subscriptions'
AND n.nspname = 'public'
AND c.contype = 'c';

-- 2. Ver la estructura de la columna subscription_type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name = 'subscription_type';

-- 3. Ver todos los valores únicos actuales en subscription_type
SELECT DISTINCT subscription_type, COUNT(*) as count
FROM user_subscriptions
GROUP BY subscription_type
ORDER BY count DESC;

-- 4. Intentar identificar el constraint específico
SELECT 
    'Constraint violado:' as info,
    'premium_monthly no está permitido' as problema,
    'Valores permitidos probablemente:' as solucion;