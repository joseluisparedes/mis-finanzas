-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS change_user_subscription(text, text, jsonb);
DROP FUNCTION IF EXISTS change_user_subscription(text, text);

-- Create the function with correct signature
CREATE OR REPLACE FUNCTION change_user_subscription(
    target_user_email TEXT,
    new_subscription_type TEXT,
    payment_info JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    is_admin BOOLEAN;
    subscription_record RECORD;
    result JSON;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('success', false, 'error', 'No admin permissions');
    END IF;
    
    -- Obtener ID del usuario objetivo
    SELECT id FROM auth.users WHERE email = target_user_email INTO target_user_id;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;
    
    -- Validar tipo de suscripción
    IF new_subscription_type NOT IN ('free', 'premium', 'family', 'admin') THEN
        RETURN json_build_object('success', false, 'error', 'Tipo de suscripción inválido');
    END IF;
    
    -- Configurar límites según el tipo de suscripción
    INSERT INTO user_subscriptions (
        user_id,
        subscription_type,
        status,
        started_at,
        monthly_transaction_limit,
        budget_limit,
        custom_category_limit,
        custom_payment_method_limit,
        custom_income_type_limit,
        recurring_transaction_limit,
        report_months_limit,
        multi_currency_enabled,
        excel_export_enabled,
        excel_import_enabled,
        advanced_reports_enabled,
        is_early_bird,
        early_bird_price,
        price_paid,
        billing_period,
        notes
    )
    VALUES (
        target_user_id,
        new_subscription_type,
        'active',
        NOW(),
        -- Límites según tipo
        CASE 
            WHEN new_subscription_type = 'free' THEN 30
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 2
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 3
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 2
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 1
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 5
            ELSE -1 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN 3
            ELSE -1 
        END,
        -- Features según tipo
        CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        -- Payment info from JSONB
        COALESCE((payment_info->>'is_early_bird')::boolean, false),
        CASE 
            WHEN (payment_info->>'is_early_bird')::boolean = true THEN (payment_info->>'price')::decimal
            ELSE NULL
        END,
        COALESCE((payment_info->>'price')::decimal, 0),
        payment_info->>'billing_period',
        payment_info->>'notes'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = new_subscription_type,
        status = 'active',
        started_at = NOW(),
        monthly_transaction_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 30
            ELSE -1 
        END,
        budget_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 2
            ELSE -1 
        END,
        custom_category_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 3
            ELSE -1 
        END,
        custom_payment_method_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 2
            ELSE -1 
        END,
        custom_income_type_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 1
            ELSE -1 
        END,
        recurring_transaction_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 5
            ELSE -1 
        END,
        report_months_limit = CASE 
            WHEN new_subscription_type = 'free' THEN 3
            ELSE -1 
        END,
        multi_currency_enabled = CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        excel_export_enabled = CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        excel_import_enabled = CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        advanced_reports_enabled = CASE 
            WHEN new_subscription_type = 'free' THEN false
            ELSE true 
        END,
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::boolean = true THEN (payment_info->>'price')::decimal
            ELSE NULL
        END,
        price_paid = COALESCE((payment_info->>'price')::decimal, 0),
        billing_period = payment_info->>'billing_period',
        notes = payment_info->>'notes',
        updated_at = NOW()
    RETURNING * INTO subscription_record;
    
    -- Construir respuesta exitosa
    result := json_build_object(
        'success', true,
        'message', format('Usuario %s cambiado a %s exitosamente', target_user_email, new_subscription_type),
        'user_id', target_user_id,
        'subscription_type', subscription_record.subscription_type,
        'status', subscription_record.status
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false, 
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION change_user_subscription(TEXT, TEXT, JSONB) TO anon, authenticated;

SELECT '✅ Function change_user_subscription created successfully' as status;