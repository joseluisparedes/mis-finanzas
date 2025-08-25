-- SOLUCIÓN DEFINITIVA basada en análisis del frontend
DROP FUNCTION IF EXISTS public.change_user_subscription CASCADE;

-- El frontend llama: onConfirm(user.users?.email, selectedPlan, extraData)
-- Que se traduce a: changeUserSubscription(userEmail, newType, extraData)
-- Que envía RPC: { new_subscription_type: newType, payment_info: {..., target_user_email: userEmail} }

CREATE FUNCTION public.change_user_subscription(
    new_subscription_type TEXT,
    payment_info JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    is_admin BOOLEAN;
    user_email TEXT;
    result_msg TEXT;
BEGIN
    -- Extraer email del JSONB (lo puso ahí el frontend en línea 77)
    user_email := payment_info->>'target_user_email';
    
    -- Debug: Log what we received
    RAISE LOG 'Received payment_info: %, email extracted: %', payment_info, user_email;
    
    -- Verificar email
    IF user_email IS NULL OR user_email = '' OR user_email = 'null' THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Email requerido. Recibido: ' || COALESCE(user_email, 'NULL') || '. PaymentInfo: ' || payment_info::text
        );
    END IF;
    
    -- Verificar admin
    SELECT is_current_user_admin() INTO is_admin;
    IF NOT is_admin THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos admin');
    END IF;
    
    -- Buscar usuario
    SELECT id FROM auth.users WHERE email = user_email INTO target_user_id;
    IF target_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado: ' || user_email);
    END IF;
    
    -- Validar plan
    IF new_subscription_type NOT IN ('free', 'premium', 'family', 'admin') THEN
        RETURN json_build_object('success', false, 'error', 'Plan inválido: ' || new_subscription_type);
    END IF;
    
    -- Actualizar suscripción con todos los campos necesarios
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status, started_at,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled,
        excel_import_enabled, advanced_reports_enabled,
        is_early_bird, early_bird_price, price_paid,
        billing_period, notes, updated_at
    )
    VALUES (
        target_user_id, new_subscription_type, 'active', NOW(),
        CASE WHEN new_subscription_type = 'free' THEN 30 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 2 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 3 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 2 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 1 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 5 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN 3 ELSE -1 END,
        CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        COALESCE((payment_info->>'is_early_bird')::boolean, false),
        CASE WHEN (payment_info->>'is_early_bird')::boolean = true THEN (payment_info->>'price')::decimal ELSE NULL END,
        COALESCE((payment_info->>'price')::decimal, 0),
        payment_info->>'billing_period',
        payment_info->>'notes',
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = new_subscription_type,
        status = 'active',
        started_at = NOW(),
        monthly_transaction_limit = CASE WHEN new_subscription_type = 'free' THEN 30 ELSE -1 END,
        budget_limit = CASE WHEN new_subscription_type = 'free' THEN 2 ELSE -1 END,
        custom_category_limit = CASE WHEN new_subscription_type = 'free' THEN 3 ELSE -1 END,
        custom_payment_method_limit = CASE WHEN new_subscription_type = 'free' THEN 2 ELSE -1 END,
        custom_income_type_limit = CASE WHEN new_subscription_type = 'free' THEN 1 ELSE -1 END,
        recurring_transaction_limit = CASE WHEN new_subscription_type = 'free' THEN 5 ELSE -1 END,
        report_months_limit = CASE WHEN new_subscription_type = 'free' THEN 3 ELSE -1 END,
        multi_currency_enabled = CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        excel_export_enabled = CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        excel_import_enabled = CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        advanced_reports_enabled = CASE WHEN new_subscription_type = 'free' THEN false ELSE true END,
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE WHEN (payment_info->>'is_early_bird')::boolean = true THEN (payment_info->>'price')::decimal ELSE NULL END,
        price_paid = COALESCE((payment_info->>'price')::decimal, 0),
        billing_period = payment_info->>'billing_period',
        notes = payment_info->>'notes',
        updated_at = NOW();
    
    result_msg := format('Usuario %s cambiado a %s exitosamente', user_email, upper(new_subscription_type));
    
    RETURN json_build_object(
        'success', true,
        'message', result_msg,
        'user_email', user_email,
        'new_type', new_subscription_type
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false, 
            'error', format('Error SQL: %s. Estado: %s', SQLERRM, SQLSTATE),
            'debug_info', format('Email: %s, Type: %s', COALESCE(user_email, 'NULL'), new_subscription_type)
        );
END $$;

GRANT EXECUTE ON FUNCTION public.change_user_subscription(TEXT, JSONB) TO anon, authenticated;

-- Test interno de la función
DO $$
DECLARE
    test_result JSON;
    test_payload JSONB;
BEGIN
    -- Simular payload del frontend
    test_payload := '{"target_user_email": "jose241100@gmail.com", "price": 15, "billing_period": "monthly"}'::jsonb;
    
    -- Test la función
    SELECT public.change_user_subscription('premium', test_payload) INTO test_result;
    
    RAISE NOTICE 'Test result: %', test_result;
END $$;