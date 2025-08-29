-- ====================================================================
-- RESTORE TO STABLE VERSION - LIMPIAR VARIABLES DE DEBUG
-- ====================================================================
-- Propósito: Restaurar estado estable donde Yape/Plin funcionaba
-- Fecha: 2025-08-29
-- ====================================================================

-- 1. Asegurar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 2. Limpiar cualquier función problemática que pueda existir
DROP FUNCTION IF EXISTS admin_get_all_users() CASCADE;
DROP FUNCTION IF EXISTS admin_manage_user_status(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_change_user_subscription(TEXT, TEXT, JSON) CASCADE;
DROP FUNCTION IF EXISTS admin_get_stats() CASCADE;

-- 3. Verificar que las funciones básicas existen y funcionan
DO $$
BEGIN
    -- Verificar get_all_subscriptions_admin existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_all_subscriptions_admin'
    ) THEN
        RAISE NOTICE 'ADVERTENCIA: get_all_subscriptions_admin no existe, se necesita recrear';
    END IF;
    
    -- Verificar safe_degrade_user existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'safe_degrade_user'
    ) THEN
        RAISE NOTICE 'ADVERTENCIA: safe_degrade_user no existe, se necesita recrear';
    END IF;
END $$;

-- 4. Mostrar estado actual de usuarios para verificar
SELECT 
    '=== ESTADO ACTUAL DE USUARIOS ===' as info,
    au.email,
    us.subscription_type,
    us.status,
    CASE 
        WHEN au.email = 'jose241100@gmail.com' THEN '👑 ADMIN PRINCIPAL'
        WHEN us.status = 'deleted' THEN '🚫 DESHABILITADO'
        WHEN us.status = 'suspended' THEN '⏸️ SUSPENDIDO'
        WHEN us.status = 'active' THEN '✅ ACTIVO'
        ELSE '❓ ESTADO DESCONOCIDO'
    END as estado_visual,
    au.id as user_id
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
ORDER BY 
    CASE WHEN au.email = 'jose241100@gmail.com' THEN 1 ELSE 2 END,
    us.created_at DESC NULLS LAST;

-- 5. Verificar funciones RPC disponibles
SELECT 
    '=== FUNCIONES RPC DISPONIBLES ===' as info,
    proname as function_name,
    CASE 
        WHEN proname LIKE '%admin%' THEN '👑 ADMIN'
        WHEN proname LIKE '%degrade%' THEN '⬇️ USER MGMT'
        WHEN proname LIKE '%subscription%' THEN '💳 SUBSCRIPTION'
        ELSE '🔧 OTHER'
    END as category
FROM pg_proc 
WHERE proname IN (
    'get_all_subscriptions_admin',
    'safe_degrade_user',
    'get_subscription_stats',
    'is_current_user_admin'
)
ORDER BY category, proname;

-- ====================================================================
-- RESULTADO ESPERADO:
-- - José debe aparecer como ADMIN PRINCIPAL
-- - Funciones básicas deben existir
-- - Sin variables de debug en el sistema
-- ====================================================================