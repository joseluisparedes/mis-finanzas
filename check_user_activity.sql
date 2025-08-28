-- ==============================================
-- QUERY PARA VERIFICAR ACTIVIDAD DE USUARIOS
-- Identifica usuarios que han registrado gastos o ingresos
-- Excluye a jose241100@gmail.com
-- ==============================================

-- 1. RESUMEN GENERAL DE ACTIVIDAD POR USUARIO
SELECT 
    u.email,
    us.subscription_type,
    us.status,
    us.created_at as fecha_registro,
    COALESCE(gastos.total_gastos, 0) as total_gastos,
    COALESCE(gastos.cantidad_gastos, 0) as cantidad_gastos,
    COALESCE(ingresos.total_ingresos, 0) as total_ingresos,
    COALESCE(ingresos.cantidad_ingresos, 0) as cantidad_ingresos,
    CASE 
        WHEN COALESCE(gastos.cantidad_gastos, 0) > 0 OR COALESCE(ingresos.cantidad_ingresos, 0) > 0 
        THEN 'ACTIVO' 
        ELSE 'SIN ACTIVIDAD' 
    END as estado_actividad
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        COUNT(*) as cantidad_gastos,
        SUM(amount) as total_gastos
    FROM expenses 
    GROUP BY user_id
) gastos ON u.id = gastos.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        COUNT(*) as cantidad_ingresos,
        SUM(amount) as total_ingresos
    FROM income 
    GROUP BY user_id
) ingresos ON u.id = ingresos.user_id
WHERE u.email != 'jose241100@gmail.com'
  AND (gastos.cantidad_gastos > 0 OR ingresos.cantidad_ingresos > 0)
ORDER BY 
    (COALESCE(gastos.cantidad_gastos, 0) + COALESCE(ingresos.cantidad_ingresos, 0)) DESC;

-- ==============================================
-- 2. QUERY SIMPLIFICADA - SOLO USUARIOS ACTIVOS
-- ==============================================
SELECT 
    u.email,
    us.subscription_type,
    COUNT(DISTINCT e.id) as gastos_registrados,
    COUNT(DISTINCT i.id) as ingresos_registrados,
    COUNT(DISTINCT e.id) + COUNT(DISTINCT i.id) as transacciones_totales
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN expenses e ON u.id = e.user_id
LEFT JOIN income i ON u.id = i.user_id
WHERE u.email != 'jose241100@gmail.com'
GROUP BY u.email, us.subscription_type
HAVING COUNT(DISTINCT e.id) > 0 OR COUNT(DISTINCT i.id) > 0
ORDER BY transacciones_totales DESC;

-- ==============================================
-- 3. ESTADÍSTICAS GENERALES DEL SISTEMA
-- ==============================================
SELECT 
    'RESUMEN GENERAL' as tipo,
    COUNT(DISTINCT u.id) as total_usuarios_registrados,
    COUNT(DISTINCT CASE WHEN u.email != 'jose241100@gmail.com' THEN u.id END) as otros_usuarios,
    COUNT(DISTINCT e.user_id) as usuarios_con_gastos,
    COUNT(DISTINCT i.user_id) as usuarios_con_ingresos,
    COUNT(DISTINCT CASE WHEN u.email != 'jose241100@gmail.com' AND e.user_id IS NOT NULL THEN u.id END) as otros_usuarios_con_gastos,
    COUNT(DISTINCT CASE WHEN u.email != 'jose241100@gmail.com' AND i.user_id IS NOT NULL THEN u.id END) as otros_usuarios_con_ingresos
FROM auth.users u
LEFT JOIN expenses e ON u.id = e.user_id
LEFT JOIN income i ON u.id = i.user_id;

-- ==============================================
-- 4. DETALLE DE ÚLTIMAS TRANSACCIONES DE OTROS USUARIOS
-- ==============================================
SELECT 
    'GASTOS' as tipo_transaccion,
    u.email,
    e.description,
    e.amount,
    e.date,
    e.created_at,
    c.name as categoria,
    pm.name as metodo_pago
FROM expenses e
JOIN auth.users u ON e.user_id = u.id
LEFT JOIN categories c ON e.category_id = c.id
LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
WHERE u.email != 'jose241100@gmail.com'
ORDER BY e.created_at DESC
LIMIT 10

UNION ALL

SELECT 
    'INGRESOS' as tipo_transaccion,
    u.email,
    i.description,
    i.amount,
    i.date,
    i.created_at,
    it.name as categoria,
    NULL as metodo_pago
FROM income i
JOIN auth.users u ON i.user_id = u.id
LEFT JOIN income_types it ON i.income_type_id = it.id
WHERE u.email != 'jose241100@gmail.com'
ORDER BY created_at DESC
LIMIT 10;

-- ==============================================
-- 5. USUARIOS PREMIUM/FAMILY QUE ESTÁN USANDO EL SISTEMA
-- ==============================================
SELECT 
    u.email,
    us.subscription_type,
    us.price_paid,
    us.is_early_bird,
    us.created_at as fecha_suscripcion,
    COALESCE(actividad.total_transacciones, 0) as transacciones_realizadas,
    COALESCE(actividad.ultimo_uso, 'Nunca') as ultimo_uso
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_transacciones,
        MAX(GREATEST(
            COALESCE((SELECT MAX(created_at) FROM expenses WHERE user_id = t.user_id), '1900-01-01'::timestamp),
            COALESCE((SELECT MAX(created_at) FROM income WHERE user_id = t.user_id), '1900-01-01'::timestamp)
        ))::text as ultimo_uso
    FROM (
        SELECT user_id FROM expenses
        UNION
        SELECT user_id FROM income
    ) t
    GROUP BY user_id
) actividad ON u.id = actividad.user_id
WHERE u.email != 'jose241100@gmail.com'
  AND us.subscription_type IN ('premium', 'family')
ORDER BY us.created_at DESC;

-- ==============================================
-- INSTRUCCIONES DE USO:
-- ==============================================
-- 1. Ejecuta la Query #1 para ver un resumen completo de todos los usuarios activos
-- 2. Ejecuta la Query #2 para una vista simplificada
-- 3. Ejecuta la Query #3 para estadísticas generales del sistema
-- 4. Ejecuta la Query #4 para ver las últimas transacciones de otros usuarios
-- 5. Ejecuta la Query #5 para ver usuarios Premium/Family y su nivel de uso

-- NOTA: Si alguna query falla por permisos de auth.users, 
-- usa user_subscriptions.user_email en su lugar