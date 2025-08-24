-- ==============================================
-- PROMOVER JOSÉ A ADMINISTRADOR
-- Email: jose241100@gmail.com
-- ==============================================

-- Función para promover por email específico
CREATE OR REPLACE FUNCTION make_jose_admin()
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    result_data JSON;
BEGIN
    -- Buscar usuario por email
    SELECT id FROM auth.users 
    WHERE email = 'jose241100@gmail.com' 
    INTO target_user_id;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'error', true,
            'message', 'Usuario con email jose241100@gmail.com no encontrado'
        );
    END IF;
    
    -- Insertar o actualizar como admin
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled, 
        excel_import_enabled, advanced_reports_enabled
    )
    VALUES (
        target_user_id, 'admin', 'active',
        -1, -1, -1, -1, -1, -1, -1,
        true, true, true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = 'admin',
        status = 'active',
        monthly_transaction_limit = -1,
        budget_limit = -1,
        custom_category_limit = -1,
        custom_payment_method_limit = -1,
        custom_income_type_limit = -1,
        recurring_transaction_limit = -1,
        report_months_limit = -1,
        multi_currency_enabled = true,
        excel_export_enabled = true,
        excel_import_enabled = true,
        advanced_reports_enabled = true,
        updated_at = NOW();
    
    -- Verificar que se aplicó correctamente
    SELECT json_build_object(
        'user_id', user_id,
        'email', 'jose241100@gmail.com',
        'subscription_type', subscription_type,
        'status', status,
        'monthly_transaction_limit', monthly_transaction_limit,
        'multi_currency_enabled', multi_currency_enabled,
        'excel_export_enabled', excel_export_enabled
    )
    FROM user_subscriptions 
    WHERE user_id = target_user_id
    INTO result_data;
    
    RETURN json_build_object(
        'success', true,
        'message', 'José promovido a administrador exitosamente',
        'data', result_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EJECUTAR: Promover a José a admin
SELECT make_jose_admin();

-- VERIFICAR: Mostrar información del usuario
SELECT 
    u.email,
    us.subscription_type,
    us.status,
    us.monthly_transaction_limit,
    us.multi_currency_enabled,
    us.excel_export_enabled,
    us.created_at
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jose241100@gmail.com';