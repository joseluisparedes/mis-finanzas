-- Consultar detalles del LOG ID: aef3a354-a61e-427f-a1a3-d06c9f62ae0e
-- ================================================================

-- 1. Buscar en tabla de logs de cambios de suscripción
SELECT 
    'SUBSCRIPTION CHANGE LOG' as tabla,
    scl.id,
    scl.user_id,
    scl.admin_id,
    scl.action_type,
    scl.old_subscription_type,
    scl.new_subscription_type,
    scl.old_end_date,
    scl.new_end_date,
    scl.notes,
    scl.created_at,
    au1.email as user_email,
    au2.email as admin_email
FROM subscription_change_log scl
LEFT JOIN auth.users au1 ON scl.user_id = au1.id
LEFT JOIN auth.users au2 ON scl.admin_id = au2.id
WHERE scl.id = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e'

UNION ALL

-- 2. Buscar en tabla de logs de contacto admin
SELECT 
    'ADMIN CONTACT LOG' as tabla,
    acl.id::text,
    acl.user_id,
    acl.admin_id,
    acl.contact_method as action_type,
    acl.contact_reason as old_subscription_type,
    NULL as new_subscription_type,
    NULL as old_end_date,
    NULL as new_end_date,
    acl.notes,
    acl.created_at,
    au1.email as user_email,
    au2.email as admin_email
FROM admin_contact_log acl
LEFT JOIN auth.users au1 ON acl.user_id = au1.id
LEFT JOIN auth.users au2 ON acl.admin_id = au2.id
WHERE acl.id::text = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e'

UNION ALL

-- 3. Buscar en cualquier otra tabla que pueda tener este ID
SELECT 
    'USER_PROFILES' as tabla,
    up.user_id::text as id,
    up.user_id,
    NULL as admin_id,
    up.subscription_type as action_type,
    up.display_name as old_subscription_type,
    NULL as new_subscription_type,
    NULL as old_end_date,
    NULL as new_end_date,
    NULL as notes,
    up.created_at,
    au.email as user_email,
    NULL as admin_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id::text = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e'

ORDER BY created_at DESC;

-- Consulta alternativa si no se encuentra en las tablas principales
-- ================================================================

SELECT 'SEARCHING IN ALL POSSIBLE LOCATIONS...' as info;

-- Verificar si es un user_id
SELECT 'USER PROFILE INFO' as tipo, * 
FROM user_profiles 
WHERE user_id::text = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e';

-- Verificar si es un ID de transacción o gasto
SELECT 'EXPENSES' as tipo, e.id, e.description, e.amount, e.created_at, au.email
FROM expenses e
LEFT JOIN auth.users au ON e.user_id = au.id
WHERE e.id::text = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e';

-- Verificar si es un ID de ingreso
SELECT 'INCOMES' as tipo, i.id, i.description, i.amount, i.created_at, au.email
FROM incomes i
LEFT JOIN auth.users au ON i.user_id = au.id
WHERE i.id::text = 'aef3a354-a61e-427f-a1a3-d06c9f62ae0e';