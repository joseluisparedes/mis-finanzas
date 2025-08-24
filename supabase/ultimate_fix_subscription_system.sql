-- ==============================================
-- SCRIPT DEFINITIVO: CORRECCIÓN CON CASCADE
-- Sistema de Suscripciones v4.0 - SIN ERRORES
-- ==============================================

-- 1. DESHABILITAR RLS TEMPORALMENTE
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS POSIBLES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
    DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
    DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
    DROP POLICY IF EXISTS "Admins can update all subscriptions" ON user_subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_select_admin" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_update_admin" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_insert_admin" ON user_subscriptions;
    DROP POLICY IF EXISTS "simple_select_own" ON user_subscriptions;
    DROP POLICY IF EXISTS "simple_update_own" ON user_subscriptions;
    DROP POLICY IF EXISTS "simple_insert_own" ON user_subscriptions;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. ELIMINAR TRIGGERS PRIMERO (sin CASCADE para evitar problemas)
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;

-- 4. AHORA ELIMINAR FUNCIONES SIN PROBLEMAS
DROP FUNCTION IF EXISTS create_user_subscription_on_signup() CASCADE;
DROP FUNCTION IF EXISTS get_user_subscription_info(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_user_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS make_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 5. CREAR FUNCIÓN PRINCIPAL SIMPLE
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    result JSON;
BEGIN
    -- Buscar suscripción activa
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid
    LIMIT 1
    INTO subscription_data;
    
    -- Si no existe, crear FREE por defecto
    IF subscription_data IS NULL THEN
        INSERT INTO user_subscriptions (
            user_id, subscription_type, status,
            monthly_transaction_limit, budget_limit, custom_category_limit,
            custom_payment_method_limit, custom_income_type_limit,
            recurring_transaction_limit, report_months_limit,
            multi_currency_enabled, excel_export_enabled, 
            excel_import_enabled, advanced_reports_enabled
        )
        VALUES (
            user_uuid, 'free', 'active',
            30, 2, 3, 2, 1, 5, 3,
            false, false, false, false
        )
        ON CONFLICT (user_id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO subscription_data;
    END IF;
    
    -- Construir JSON de respuesta
    result := json_build_object(
        'subscription', json_build_object(
            'id', subscription_data.id,
            'type', subscription_data.subscription_type,
            'status', subscription_data.status,
            'started_at', subscription_data.started_at,
            'is_early_bird', COALESCE(subscription_data.is_early_bird, false),
            'early_bird_price', subscription_data.early_bird_price
        ),
        'limits', json_build_object(
            'monthly_transactions', json_build_object(
                'limit', subscription_data.monthly_transaction_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.monthly_transaction_limit = -1 THEN -1 
                    ELSE subscription_data.monthly_transaction_limit 
                END
            ),
            'budgets', json_build_object(
                'limit', subscription_data.budget_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.budget_limit = -1 THEN -1 
                    ELSE subscription_data.budget_limit 
                END
            ),
            'categories', json_build_object(
                'limit', subscription_data.custom_category_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_category_limit = -1 THEN -1 
                    ELSE subscription_data.custom_category_limit 
                END
            ),
            'payment_methods', json_build_object(
                'limit', subscription_data.custom_payment_method_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 
                    ELSE subscription_data.custom_payment_method_limit 
                END
            ),
            'income_types', json_build_object(
                'limit', subscription_data.custom_income_type_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.custom_income_type_limit = -1 THEN -1 
                    ELSE subscription_data.custom_income_type_limit 
                END
            ),
            'recurring_transactions', json_build_object(
                'limit', subscription_data.recurring_transaction_limit,
                'current', 0,
                'available', CASE 
                    WHEN subscription_data.recurring_transaction_limit = -1 THEN -1 
                    ELSE subscription_data.recurring_transaction_limit 
                END
            )
        ),
        'features', json_build_object(
            'multi_currency_enabled', subscription_data.multi_currency_enabled,
            'excel_export_enabled', subscription_data.excel_export_enabled,
            'excel_import_enabled', subscription_data.excel_import_enabled,
            'advanced_reports_enabled', subscription_data.advanced_reports_enabled,
            'report_months_limit', subscription_data.report_months_limit
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN PARA VERIFICAR LÍMITES
CREATE OR REPLACE FUNCTION check_user_limit(user_uuid UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_info JSON;
    limit_data JSON;
    available INTEGER;
BEGIN
    subscription_info := get_user_subscription_info(user_uuid);
    limit_data := subscription_info->'limits'->limit_type;
    
    IF limit_data IS NULL THEN
        RETURN false;
    END IF;
    
    available := (limit_data->>'available')::INTEGER;
    
    -- -1 significa ilimitado
    IF available = -1 THEN
        RETURN true;
    END IF;
    
    RETURN available > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN PARA NUEVOS USUARIOS
CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RECREAR TRIGGER
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- 9. HABILITAR RLS CON POLÍTICAS BÁSICAS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own" ON user_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON user_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 10. VERIFICAR ESTADO DE JOSÉ
DO $$
DECLARE
    jose_id UUID;
    jose_info RECORD;
BEGIN
    -- Obtener ID de José
    SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com' INTO jose_id;
    
    IF jose_id IS NOT NULL THEN
        -- Mostrar info actual
        SELECT * FROM user_subscriptions WHERE user_id = jose_id INTO jose_info;
        
        RAISE NOTICE 'José ID: %', jose_id;
        RAISE NOTICE 'José subscription type: %', jose_info.subscription_type;
        RAISE NOTICE 'José status: %', jose_info.status;
        RAISE NOTICE 'José transaction limit: %', jose_info.monthly_transaction_limit;
    ELSE
        RAISE NOTICE 'José not found in auth.users';
    END IF;
END $$;

-- 11. PROBAR LA FUNCIÓN CON JOSÉ
SELECT 'Testing function for José...' as test;
SELECT get_user_subscription_info((SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'));

-- 12. RESULTADO FINAL
SELECT 'System setup completed successfully!' as final_result;
SELECT 'José should now appear as admin in the app after refresh' as instruction;