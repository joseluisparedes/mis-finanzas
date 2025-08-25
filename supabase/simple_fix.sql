-- Crear función simple que funcione con el frontend actual
DROP FUNCTION IF EXISTS change_user_subscription;
DROP FUNCTION IF EXISTS public.change_user_subscription;

CREATE OR REPLACE FUNCTION public.change_user_subscription(
    new_subscription_type TEXT,
    payment_info JSONB
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    is_admin BOOLEAN;
    subscription_record RECORD;
    result JSON;
    user_email TEXT;
BEGIN
    -- Extraer email del payment_info
    user_email := payment_info->>'target_user_email';
    
    -- Verificar que tenemos email
    IF user_email IS NULL OR user_email = '' THEN
        RETURN json_build_object('success', false, 'error', 'Email de usuario requerido en payment_info');
    END IF;
    
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('success', false, 'error', 'No admin permissions');
    END IF;
    
    -- Obtener ID del usuario objetivo
    SELECT id FROM auth.users WHERE email = user_email INTO target_user_id;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado: ' || user_email);
    END IF;
    
    -- Validar tipo de suscripción
    IF new_subscription_type NOT IN ('free', 'premium', 'family', 'admin') THEN
        RETURN json_build_object('success', false, 'error', 'Tipo de suscripción inválido');
    END IF;
    
    -- Actualizar suscripción
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status, started_at,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled,
        excel_import_enabled, advanced_reports_enabled,
        is_early_bird, early_bird_price, price_paid,
        billing_period, notes
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
        payment_info->>'notes'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = new_subscription_type,
        status = 'active',
        started_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO subscription_record;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Usuario %s cambiado a %s exitosamente', user_email, new_subscription_type)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.change_user_subscription(TEXT, JSONB) TO anon, authenticated;