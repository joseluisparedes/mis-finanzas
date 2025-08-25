-- Solución simple sin conflictos de nombres
DROP FUNCTION IF EXISTS create_user_subscription_on_signup() CASCADE;
DROP FUNCTION IF EXISTS repair_users_without_subscription() CASCADE;

CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
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
        advanced_reports_enabled
    ) VALUES (
        NEW.id,
        'free',
        'active',
        NOW(),
        30, 2, 3, 2, 1, 5, 3,
        false, false, false, false
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error pero no fallar la creación del usuario
        RAISE LOG 'Error creando suscripción: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS user_subscription_trigger ON auth.users;

-- Crear trigger
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- Crear suscripción para usuarios sin ella (query simple)
INSERT INTO user_subscriptions (
    user_id, subscription_type, status, started_at,
    monthly_transaction_limit, budget_limit, custom_category_limit,
    custom_payment_method_limit, custom_income_type_limit,
    recurring_transaction_limit, report_months_limit,
    multi_currency_enabled, excel_export_enabled,
    excel_import_enabled, advanced_reports_enabled
)
SELECT 
    au.id, 'free', 'active', NOW(),
    30, 2, 3, 2, 1, 5, 3,
    false, false, false, false
FROM auth.users au
LEFT JOIN user_subscriptions us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

SELECT '✅ Trigger simple creado correctamente' as status;