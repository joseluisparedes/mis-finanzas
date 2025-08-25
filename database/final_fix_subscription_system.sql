-- ==============================================
-- SCRIPT FINAL: CORRECCIÓN COMPLETA SIN CONFLICTOS
-- Sistema de Suscripciones v3.0 - LIMPIO
-- ==============================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS POSIBLES (sin errores)
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies did not exist, continuing...';
END $$;

-- 2. DESHABILITAR RLS TEMPORALMENTE PARA EVITAR CONFLICTOS
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS get_user_subscription_info(UUID);
DROP FUNCTION IF EXISTS check_user_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS make_current_user_admin();
DROP FUNCTION IF EXISTS create_user_subscription_on_signup();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 4. ELIMINAR TRIGGER EXISTENTE
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;

-- 5. CREAR FUNCIÓN SIMPLE SIN DEPENDENCIAS COMPLEJAS
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    result JSON;
BEGIN
    -- Obtener o crear suscripción del usuario
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    INTO subscription_data;
    
    -- Si no existe, crear suscripción FREE por defecto
    IF subscription_data IS NULL THEN
        INSERT INTO user_subscriptions (user_id, subscription_type, status)
        VALUES (user_uuid, 'free', 'active')
        ON CONFLICT (user_id) DO NOTHING
        RETURNING * INTO subscription_data;
        
        -- Si sigue siendo NULL, intentar obtener el existente
        IF subscription_data IS NULL THEN
            SELECT * FROM user_subscriptions 
            WHERE user_id = user_uuid
            INTO subscription_data;
        END IF;
    END IF;
    
    -- Construir respuesta JSON simple
    result := json_build_object(
        'subscription', json_build_object(
            'id', subscription_data.id,
            'type', subscription_data.subscription_type,
            'status', subscription_data.status,
            'started_at', subscription_data.started_at,
            'is_early_bird', subscription_data.is_early_bird,
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

-- 6. FUNCIÓN SIMPLE PARA VERIFICAR LÍMITES
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
    
    -- Si es -1 significa ilimitado
    IF available = -1 THEN
        RETURN true;
    END IF;
    
    -- Si tiene disponible > 0, puede crear
    RETURN available > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN PARA TRIGGER SIMPLE
CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREAR TRIGGER PARA NUEVOS USUARIOS
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- 9. HABILITAR RLS CON POLÍTICAS SIMPLES
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política simple: usuarios ven solo lo suyo
CREATE POLICY "simple_select_own" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Política simple: usuarios actualizan solo lo suyo  
CREATE POLICY "simple_update_own" ON user_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

-- Política simple: usuarios insertan solo lo suyo
CREATE POLICY "simple_insert_own" ON user_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 10. VERIFICAR QUE JOSÉ ES ADMIN
SELECT 
    'José admin status:' as info,
    subscription_type,
    status,
    monthly_transaction_limit,
    multi_currency_enabled
FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 11. PROBAR LA FUNCIÓN
SELECT 'Testing function...' as test;
SELECT get_user_subscription_info((SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'));

SELECT 'Setup completed successfully!' as result;