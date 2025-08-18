-- SQL para validar que el trigger se creó correctamente

-- 1. Verificar que existe la función
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_default_user_data';

-- 2. Verificar que existe el trigger
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    n.nspname as schema_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname = 'on_auth_user_created';

-- 3. Verificar todos los triggers en la tabla auth.users
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    CASE t.tgtype & 2 
        WHEN 0 THEN 'BEFORE'
        ELSE 'AFTER'
    END as timing,
    CASE t.tgtype & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 12 THEN 'INSERT, DELETE'
        WHEN 20 THEN 'INSERT, UPDATE'
        WHEN 24 THEN 'DELETE, UPDATE'
        WHEN 28 THEN 'INSERT, DELETE, UPDATE'
    END as events
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' AND n.nspname = 'auth'
  AND NOT t.tgisinternal;