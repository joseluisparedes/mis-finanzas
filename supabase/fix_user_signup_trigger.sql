-- Verificar el estado actual del trigger
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    trigger_schema,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' AND trigger_name LIKE '%subscription%';

-- Verificar funciones relacionadas con signup
SELECT routine_name, routine_schema
FROM information_schema.routines 
WHERE routine_name LIKE '%user%' AND routine_name LIKE '%subscription%';

-- Recrear la función de signup limpia y segura
DROP FUNCTION IF EXISTS create_user_subscription_on_signup() CASCADE;

CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    subscription_exists BOOLEAN;
BEGIN
    -- Verificar si ya existe una suscripción para este usuario
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = NEW.id
    ) INTO subscription_exists;
    
    -- Solo crear si no existe
    IF NOT subscription_exists THEN
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
                advanced_reports_enabled,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                'free',
                'active',
                NOW(),
                30,    -- monthly_transaction_limit
                2,     -- budget_limit  
                3,     -- custom_category_limit
                2,     -- custom_payment_method_limit
                1,     -- custom_income_type_limit
                5,     -- recurring_transaction_limit
                3,     -- report_months_limit
                false, -- multi_currency_enabled
                false, -- excel_export_enabled
                false, -- excel_import_enabled
                false, -- advanced_reports_enabled
                NOW(),
                NOW()
            );
            
            RAISE LOG 'Suscripción FREE creada para usuario: %', NEW.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the user creation
            RAISE LOG 'Error creando suscripción para usuario %: %', NEW.id, SQLERRM;
            -- No re-raise para evitar que falle la creación del usuario
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS user_subscription_trigger ON auth.users;

-- Crear el trigger nuevo
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- Verificar que se creó correctamente
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created_subscription';

-- Crear función para verificar/reparar usuarios sin suscripción
CREATE OR REPLACE FUNCTION repair_users_without_subscription()
RETURNS TABLE(user_id UUID, email TEXT, action TEXT) AS $$
BEGIN
    RETURN QUERY
    WITH users_without_sub AS (
        SELECT au.id, au.email
        FROM auth.users au
        LEFT JOIN user_subscriptions us ON au.id = us.user_id
        WHERE us.user_id IS NULL
    )
    INSERT INTO user_subscriptions (
        user_id, subscription_type, status, started_at,
        monthly_transaction_limit, budget_limit, custom_category_limit,
        custom_payment_method_limit, custom_income_type_limit,
        recurring_transaction_limit, report_months_limit,
        multi_currency_enabled, excel_export_enabled,
        excel_import_enabled, advanced_reports_enabled
    )
    SELECT 
        uws.id, 'free', 'active', NOW(),
        30, 2, 3, 2, 1, 5, 3,
        false, false, false, false
    FROM users_without_sub uws
    RETURNING user_subscriptions.user_id, 
              (SELECT email FROM auth.users WHERE id = user_subscriptions.user_id),
              'subscription_created' as action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar reparación para usuarios existentes sin suscripción
SELECT * FROM repair_users_without_subscription();

SELECT '✅ Trigger de signup reparado correctamente' as status;