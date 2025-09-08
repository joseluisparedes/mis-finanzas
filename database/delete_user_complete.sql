-- ================================================================
-- ELIMINACIÓN COMPLETA DE USUARIO: contacto.misfinanzaspersonales@gmail.com
-- ================================================================
-- ADVERTENCIA: Este script elimina TODOS los datos del usuario
-- Ejecutar con precaución - NO SE PUEDE DESHACER
-- ================================================================

-- 1. VERIFICAR EXISTENCIA DEL USUARIO
SELECT 
    u.id as auth_id,
    u.email,
    u.created_at,
    up.display_name,
    us.subscription_type,
    us.status,
    us.subscription_start_date,
    us.subscription_end_date
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'contacto.misfinanzaspersonales@gmail.com';

-- ================================================================
-- 2. ELIMINAR DATOS FINANCIEROS (EN ORDEN DE DEPENDENCIAS)
-- ================================================================

-- 2.1 Eliminar gastos (expenses)
DELETE FROM public.expenses 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 2.2 Eliminar ingresos (incomes)
DELETE FROM public.incomes 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 2.3 Eliminar gastos recurrentes
DELETE FROM public.recurring_expenses 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 2.4 Eliminar transacciones recurrentes (si existe la tabla)
-- DELETE FROM public.recurring_transactions 
-- WHERE user_id IN (
--     SELECT id FROM auth.users 
--     WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
-- );

-- 2.5 Eliminar presupuestos
DELETE FROM public.budgets 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 2.6 Eliminar categorías personalizadas (si las tiene)
DELETE FROM public.categories 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
) AND user_id IS NOT NULL;

-- 2.7 Eliminar balances (si existe tabla)
-- DELETE FROM public.balances 
-- WHERE user_id IN (
--     SELECT id FROM auth.users 
--     WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
-- );

-- ================================================================
-- 3. ELIMINAR LOGS Y AUDITORÍA
-- ================================================================

-- 3.1 Eliminar logs de cambios de suscripción (si existen)
DELETE FROM public.subscription_change_log 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 3.2 Eliminar logs de contacto admin (si existen)
DELETE FROM public.admin_contact_log 
WHERE target_user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- 3.3 Eliminar suscripciones
DELETE FROM public.user_subscriptions 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- ================================================================
-- 4. ELIMINAR PERFIL DE USUARIO
-- ================================================================

-- 4.1 Eliminar perfil en public.user_profiles
DELETE FROM public.user_profiles 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
);

-- ================================================================
-- 5. ELIMINAR USUARIO DE AUTH (SUPABASE)
-- ================================================================

-- ADVERTENCIA: Esto elimina el usuario del sistema de autenticación
-- Solo descomentar si estás COMPLETAMENTE SEGURO

/*
DELETE FROM auth.users 
WHERE email = 'contacto.misfinanzaspersonales@gmail.com';
*/

-- ================================================================
-- 6. VERIFICACIÓN POST-ELIMINACIÓN
-- ================================================================

-- Verificar que no queden datos del usuario
SELECT 'expenses' as tabla, COUNT(*) as registros_restantes
FROM public.expenses 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'incomes', COUNT(*)
FROM public.incomes 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'recurring_expenses', COUNT(*)
FROM public.recurring_expenses 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'budgets', COUNT(*)
FROM public.budgets 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'categories', COUNT(*)
FROM public.categories 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
) AND user_id IS NOT NULL
UNION ALL
SELECT 'user_profiles', COUNT(*)
FROM public.user_profiles 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'user_subscriptions', COUNT(*)
FROM public.user_subscriptions 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'contacto.misfinanzaspersonales@gmail.com'
)
UNION ALL
SELECT 'auth_users', COUNT(*)
FROM auth.users 
WHERE email = 'contacto.misfinanzaspersonales@gmail.com';

-- ================================================================
-- INSTRUCCIONES DE USO:
-- ================================================================
-- 1. Ejecutar paso a paso en Supabase SQL Editor
-- 2. PRIMERO ejecutar la verificación (paso 1)
-- 3. Ejecutar pasos 2-4 para eliminar datos
-- 4. SOLO si estás seguro, descomentar y ejecutar paso 5
-- 5. Ejecutar verificación final (paso 6)
-- ================================================================