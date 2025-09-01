-- DIAGNÓSTICO DE ESTRUCTURA DE TABLAS
-- ====================================

-- 1. VER ESTRUCTURA DE user_profiles
SELECT 'USER_PROFILES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. VER ESTRUCTURA DE user_subscriptions  
SELECT 'USER_SUBSCRIPTIONS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
ORDER BY ordinal_position;

-- 3. VER DATOS DE JOSÉ PARA ENTENDER LA ESTRUCTURA
SELECT 'JOSE IN AUTH.USERS:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'jose241100@gmail.com';

SELECT 'JOSE IN USER_PROFILES:' as info;
SELECT * FROM user_profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

SELECT 'JOSE IN USER_SUBSCRIPTIONS:' as info;
SELECT * FROM user_subscriptions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 4. VER SAMPLE DE DATOS PARA ENTENDER EL PATRÓN
SELECT 'SAMPLE USER_PROFILES:' as info;
SELECT * FROM user_profiles LIMIT 3;

SELECT 'SAMPLE USER_SUBSCRIPTIONS:' as info;
SELECT * FROM user_subscriptions LIMIT 3;