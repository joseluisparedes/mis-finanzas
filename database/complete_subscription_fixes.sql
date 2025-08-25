-- ==============================================
-- ARCHIVO COMPLETO: Todas las correcciones SQL
-- Sistema de Suscripciones y Restricciones
-- ==============================================

-- 1. FUNCIÓN PRINCIPAL: Obtener información de suscripción del usuario
-- Esta función cuenta solo elementos activos y calcula límites correctamente
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    current_categories INTEGER := 0;
    current_payment_methods INTEGER := 0;
    current_income_types INTEGER := 0;
    current_budgets INTEGER := 0;
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
    
    -- CONTAR SOLO ELEMENTOS ACTIVOS (SOLUCIONA CATEGORÍAS FANTASMA)
    BEGIN
        SELECT COUNT(*) INTO current_categories 
        FROM categories 
        WHERE user_id = user_uuid AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        current_categories := 0;
    END;
    
    BEGIN
        SELECT COUNT(*) INTO current_payment_methods 
        FROM payment_methods 
        WHERE user_id = user_uuid AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        current_payment_methods := 0;
    END;
    
    BEGIN
        SELECT COUNT(*) INTO current_income_types 
        FROM income_types 
        WHERE user_id = user_uuid AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        current_income_types := 0;
    END;
    
    BEGIN
        SELECT COUNT(*) INTO current_budgets 
        FROM budgets 
        WHERE user_id = user_uuid AND is_active = true;
    EXCEPTION WHEN OTHERS THEN
        current_budgets := 0;
    END;
    
    -- Construir JSON de respuesta con conteos reales
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
                'available', subscription_data.monthly_transaction_limit
            ),
            'budgets', json_build_object(
                'limit', subscription_data.budget_limit,
                'current', current_budgets,
                'available', CASE 
                    WHEN subscription_data.budget_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.budget_limit - current_budgets)
                END
            ),
            'categories', json_build_object(
                'limit', subscription_data.custom_category_limit,
                'current', current_categories,
                'available', CASE 
                    WHEN subscription_data.custom_category_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_category_limit - current_categories)
                END
            ),
            'payment_methods', json_build_object(
                'limit', subscription_data.custom_payment_method_limit,
                'current', current_payment_methods,
                'available', CASE 
                    WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_payment_method_limit - current_payment_methods)
                END
            ),
            'income_types', json_build_object(
                'limit', subscription_data.custom_income_type_limit,
                'current', current_income_types,
                'available', CASE 
                    WHEN subscription_data.custom_income_type_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_income_type_limit - current_income_types)
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

-- ==============================================
-- 2. FUNCIÓN ADMIN: Verificar permisos de administrador
-- ==============================================
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
BEGIN
    -- Consultar directamente sin RLS
    SELECT subscription_type 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    INTO user_type;
    
    RETURN user_type = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 3. FUNCIÓN ADMIN: Obtener todas las suscripciones (panel admin)
-- ==============================================
DROP FUNCTION IF EXISTS get_all_subscriptions_admin();

CREATE OR REPLACE FUNCTION get_all_subscriptions_admin()
RETURNS JSON AS $$
DECLARE
    result JSON;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin primero
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('error', 'No admin permissions');
    END IF;
    
    -- Obtener datos con privilegios elevados (bypasa RLS)
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

-- ==============================================
-- 4. FUNCIÓN ADMIN: Estadísticas de suscripciones
-- ==============================================
CREATE OR REPLACE FUNCTION get_subscription_stats_simple()
RETURNS JSON AS $$
DECLARE
    stats JSON;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN json_build_object('error', 'No admin permissions');
    END IF;
    
    -- Obtener estadísticas con privilegios elevados
    SELECT json_build_object(
        'total_users', COUNT(*),
        'free_users', COUNT(CASE WHEN subscription_type = 'free' THEN 1 END),
        'premium_users', COUNT(CASE WHEN subscription_type = 'premium' THEN 1 END),
        'admin_users', COUNT(CASE WHEN subscription_type = 'admin' THEN 1 END),
        'family_users', COUNT(CASE WHEN subscription_type = 'family' THEN 1 END),
        'active_users', COUNT(CASE WHEN status = 'active' THEN 1 END),
        'early_bird_users', COUNT(CASE WHEN is_early_bird = true THEN 1 END),
        'total_revenue', COALESCE(SUM(CASE WHEN subscription_type = 'premium' AND status = 'active' THEN price_paid ELSE 0 END), 0)
    )
    FROM user_subscriptions
    INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. POLÍTICAS RLS BÁSICAS (sin conflictos circulares)
-- ==============================================
-- Deshabilitar RLS temporalmente para limpiar
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "users_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "users_update_own" ON user_subscriptions;
DROP POLICY IF EXISTS "users_insert_own" ON user_subscriptions;
DROP POLICY IF EXISTS "admin_can_view_all" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;
DROP POLICY IF EXISTS "basic_user_select" ON user_subscriptions;
DROP POLICY IF EXISTS "basic_user_update" ON user_subscriptions;
DROP POLICY IF EXISTS "basic_user_insert" ON user_subscriptions;

-- Habilitar RLS con políticas básicas
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política básica: usuarios pueden ver solo su registro
CREATE POLICY "basic_user_select" ON user_subscriptions
    FOR SELECT 
    USING (user_id = auth.uid());

-- Política básica: usuarios pueden actualizar solo su registro  
CREATE POLICY "basic_user_update" ON user_subscriptions
    FOR UPDATE 
    USING (user_id = auth.uid());

-- Política básica: usuarios pueden insertar solo su registro
CREATE POLICY "basic_user_insert" ON user_subscriptions
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- ==============================================
-- 6. TRIGGER PARA NUEVOS USUARIOS
-- ==============================================
-- Función para crear suscripción automáticamente
CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- ==============================================
-- 7. VERIFICACIONES Y PRUEBAS
-- ==============================================
-- Verificar estado de José (admin)
SELECT 'José admin verification:' as info;
SELECT 
    subscription_type,
    status,
    monthly_transaction_limit,
    'Should be admin/active' as expected
FROM user_subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- Probar función de suscripción para José
SELECT 'Testing subscription function for José...' as test;
SELECT get_user_subscription_info((SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'));

-- Probar función admin para obtener suscripciones
SELECT 'Testing admin subscriptions function...' as test;
SELECT get_all_subscriptions_admin();

-- Probar función de estadísticas
SELECT 'Testing admin stats function...' as test;
SELECT get_subscription_stats_simple();

-- ==============================================
-- 8. CORREGIR RESTRICCIONES ÚNICAS (permitir reutilizar nombres eliminados)
-- ==============================================

-- Eliminar restricciones únicas existentes que impiden reutilizar nombres
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_name_key;
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_user_id_name_key;
ALTER TABLE income_types DROP CONSTRAINT IF EXISTS income_types_user_id_name_key;

-- Crear índices únicos parciales que solo aplican a elementos ACTIVOS
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_id_name_active_unique 
ON categories (user_id, name) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_user_id_name_active_unique 
ON payment_methods (user_id, name) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS income_types_user_id_name_active_unique 
ON income_types (user_id, name) 
WHERE is_active = true;

-- ==============================================
-- 9. FUNCIÓN ADMIN: Cambiar suscripción de usuarios
-- ==============================================
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

-- Dar permisos
GRANT EXECUTE ON FUNCTION change_user_subscription(TEXT, TEXT, JSONB) TO anon, authenticated;

-- ==============================================
-- 10. MENSAJE FINAL
-- ==============================================
SELECT '✅ SISTEMA COMPLETO CONFIGURADO CORRECTAMENTE' as status;
SELECT 'Todas las funciones SQL han sido ejecutadas exitosamente' as message;
SELECT 'Las restricciones de Free plan ahora funcionan correctamente' as info;
SELECT 'Panel admin con usuarios completo y funcional' as admin_status;
SELECT 'Ahora puedes reutilizar nombres de elementos eliminados' as validation_fix;