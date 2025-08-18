-- Script para diagnosticar problemas en la base de datos

-- 1. Verificar que existen las tablas principales
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_settings', 'categories', 'payment_methods', 'income_types', 'expenses', 'incomes')
ORDER BY table_name;

-- 2. Verificar que existe la función
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_default_user_data';

-- 3. Verificar que existe el trigger
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    n.nspname as schema_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname = 'on_auth_user_created';

-- 4. Verificar estructura de user_settings
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar estructura de categories
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'categories' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar usuarios existentes en auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 7. Verificar datos en user_settings
SELECT user_id, created_at, updated_at
FROM user_settings
ORDER BY created_at DESC
LIMIT 5;

-- 8. Verificar datos en categories
SELECT user_id, name, color, sort_order, created_at
FROM categories
ORDER BY created_at DESC
LIMIT 10;

-- 9. Probar manualmente el trigger (simulación)
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Simulando creación de datos para usuario: %', test_user_id;
    
    -- Intentar insertar configuración
    INSERT INTO user_settings (user_id) VALUES (test_user_id);
    RAISE NOTICE 'user_settings creado exitosamente';
    
    -- Intentar insertar categorías
    INSERT INTO categories (user_id, name, color, sort_order) VALUES
        (test_user_id, 'Test Comida', '#FF6B6B', 1);
    RAISE NOTICE 'categories creado exitosamente';
    
    -- Limpiar datos de prueba
    DELETE FROM categories WHERE user_id = test_user_id;
    DELETE FROM user_settings WHERE user_id = test_user_id;
    RAISE NOTICE 'Datos de prueba limpiados';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error en simulación: %', SQLERRM;
END $$;