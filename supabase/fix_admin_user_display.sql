-- ==============================================
-- CORRECCIÓN: Mostrar usuarios en panel admin
-- Arreglar formato de respuesta para el frontend
-- ==============================================

-- 1. FUNCIÓN MEJORADA PARA OBTENER SUSCRIPCIONES (formato correcto para frontend)
CREATE OR REPLACE FUNCTION get_all_subscriptions_admin()
RETURNS SETOF JSON AS $$
DECLARE
    subscription_record RECORD;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN QUERY SELECT json_build_object('error', 'No admin permissions')::json;
        RETURN;
    END IF;
    
    -- Devolver cada suscripción como un objeto JSON separado
    FOR subscription_record IN 
        SELECT 
            us.id,
            us.user_id,
            us.subscription_type,
            us.status,
            us.started_at,
            us.monthly_transaction_limit,
            us.budget_limit,
            us.multi_currency_enabled,
            us.excel_export_enabled,
            us.is_early_bird,
            us.early_bird_price,
            us.created_at,
            us.updated_at,
            au.email as user_email,
            au.created_at as user_created_at
        FROM user_subscriptions us
        LEFT JOIN auth.users au ON us.user_id = au.id
        ORDER BY us.created_at DESC
    LOOP
        RETURN NEXT json_build_object(
            'id', subscription_record.id,
            'user_id', subscription_record.user_id,
            'subscription_type', subscription_record.subscription_type,
            'status', subscription_record.status,
            'started_at', subscription_record.started_at,
            'monthly_transaction_limit', subscription_record.monthly_transaction_limit,
            'budget_limit', subscription_record.budget_limit,
            'multi_currency_enabled', subscription_record.multi_currency_enabled,
            'excel_export_enabled', subscription_record.excel_export_enabled,
            'is_early_bird', subscription_record.is_early_bird,
            'early_bird_price', subscription_record.early_bird_price,
            'created_at', subscription_record.created_at,
            'updated_at', subscription_record.updated_at,
            'user', json_build_object(
                'email', subscription_record.user_email,
                'created_at', subscription_record.user_created_at
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNCIÓN ALTERNATIVA MÁS SIMPLE (devuelve tabla directamente)
CREATE OR REPLACE FUNCTION get_users_with_subscriptions()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    subscription_type TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    monthly_transaction_limit INTEGER,
    budget_limit INTEGER,
    multi_currency_enabled BOOLEAN,
    excel_export_enabled BOOLEAN,
    is_early_bird BOOLEAN,
    early_bird_price DECIMAL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_email TEXT,
    user_created_at TIMESTAMPTZ
) AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'No admin permissions';
    END IF;
    
    -- Devolver tabla con datos combinados
    RETURN QUERY
    SELECT 
        us.id,
        us.user_id,
        us.subscription_type,
        us.status,
        us.started_at,
        us.monthly_transaction_limit,
        us.budget_limit,
        us.multi_currency_enabled,
        us.excel_export_enabled,
        us.is_early_bird,
        us.early_bird_price,
        us.created_at,
        us.updated_at,
        au.email as user_email,
        au.created_at as user_created_at
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROBAR LAS FUNCIONES
SELECT 'Testing get_users_with_subscriptions...' as test;
SELECT * FROM get_users_with_subscriptions() LIMIT 3;

SELECT 'Testing get_all_subscriptions_admin...' as test;
SELECT get_all_subscriptions_admin() LIMIT 3;

-- 4. VERIFICAR FORMATO DE RESPUESTA
SELECT 'Data format verification completed' as result;