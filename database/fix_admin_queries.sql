-- ==============================================
-- CORRECCIÓN: Queries de administración
-- Arreglar relaciones de foreign keys
-- ==============================================

-- 1. VERIFICAR LA ESTRUCTURA ACTUAL
SELECT 
    'Current user_subscriptions structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR FOREIGN KEY EXISTENTE
SELECT 
    'Foreign key constraints:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'user_subscriptions';

-- 3. RECREAR FOREIGN KEY SI ES NECESARIO
DO $$
BEGIN
    -- Verificar si ya existe la foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_subscriptions'
        AND tc.constraint_name LIKE '%user_id%'
    ) THEN
        -- Crear foreign key si no existe
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT fk_user_subscriptions_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 4. FUNCIÓN ALTERNATIVA PARA OBTENER SUSCRIPCIONES (sin JOIN automático)
CREATE OR REPLACE FUNCTION get_all_subscriptions_admin()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Construir JSON con datos combinados manualmente
    SELECT json_agg(
        json_build_object(
            'id', us.id,
            'user_id', us.user_id,
            'subscription_type', us.subscription_type,
            'status', us.status,
            'started_at', us.started_at,
            'monthly_transaction_limit', us.monthly_transaction_limit,
            'budget_limit', us.budget_limit,
            'multi_currency_enabled', us.multi_currency_enabled,
            'excel_export_enabled', us.excel_export_enabled,
            'is_early_bird', us.is_early_bird,
            'early_bird_price', us.early_bird_price,
            'created_at', us.created_at,
            'updated_at', us.updated_at,
            'user_email', au.email,
            'user_created_at', au.created_at
        ) ORDER BY us.created_at DESC
    )
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN PARA ESTADÍSTICAS SIMPLES
CREATE OR REPLACE FUNCTION get_subscription_stats_simple()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(CASE WHEN subscription_type = 'free' THEN 1 END),
        'premium_users', COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END),
        'admin_users', COUNT(CASE WHEN subscription_type = 'admin' THEN 1 END),
        'active_users', COUNT(CASE WHEN status = 'active' THEN 1 END),
        'early_bird_users', COUNT(CASE WHEN is_early_bird = true THEN 1 END),
        'total_revenue', COALESCE(SUM(CASE WHEN subscription_type = 'premium' AND status = 'active' THEN price_paid ELSE 0 END), 0)
    )
    FROM user_subscriptions
    INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ACTUALIZAR LAS POLÍTICAS RLS PARA ADMIN
DROP POLICY IF EXISTS "admin_can_view_all" ON user_subscriptions;
CREATE POLICY "admin_can_view_all" ON user_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions admin_sub
            WHERE admin_sub.user_id = auth.uid()
            AND admin_sub.subscription_type = 'admin'
            AND admin_sub.status = 'active'
        )
    );

-- 7. PROBAR LAS FUNCIONES
SELECT 'Testing admin functions...' as test;

-- Probar función de suscripciones
SELECT 'get_all_subscriptions_admin result:' as info;
SELECT get_all_subscriptions_admin();

-- Probar función de estadísticas
SELECT 'get_subscription_stats_simple result:' as info;
SELECT get_subscription_stats_simple();

-- 8. VERIFICAR QUE JOSÉ TIENE PERMISOS ADMIN
SELECT 'José admin verification:' as info;
SELECT 
    subscription_type,
    status,
    'Should be admin/active' as expected
FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

SELECT 'Admin queries fixed successfully!' as result;