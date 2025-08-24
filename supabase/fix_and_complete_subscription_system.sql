-- ==============================================
-- SCRIPT DE CORRECCIÓN Y COMPLETADO
-- Sistema de Suscripciones v2.0
-- ==============================================

-- 1. VERIFICAR Y CREAR TABLA SI NO EXISTE
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- INFORMACIÓN DE SUSCRIPCIÓN
    subscription_type TEXT NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
    
    -- FECHAS Y PERÍODOS
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- INFORMACIÓN DE PAGO
    price_paid DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'PEN',
    billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
    payment_method TEXT,
    transaction_id TEXT,
    
    -- RESTRICCIONES POR PLAN (valores por defecto para FREE)
    monthly_transaction_limit INTEGER DEFAULT 30,
    budget_limit INTEGER DEFAULT 2,
    custom_category_limit INTEGER DEFAULT 3,
    custom_payment_method_limit INTEGER DEFAULT 2,
    custom_income_type_limit INTEGER DEFAULT 1,
    recurring_transaction_limit INTEGER DEFAULT 5,
    report_months_limit INTEGER DEFAULT 3,
    multi_currency_enabled BOOLEAN DEFAULT false,
    excel_export_enabled BOOLEAN DEFAULT false,
    excel_import_enabled BOOLEAN DEFAULT false,
    advanced_reports_enabled BOOLEAN DEFAULT false,
    
    -- METADATA
    is_early_bird BOOLEAN DEFAULT false,
    early_bird_price DECIMAL(10,2),
    referral_code TEXT,
    notes TEXT,
    
    -- AUDITORÍA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- CONSTRAINT ÚNICO
    UNIQUE(user_id)
);

-- 2. HABILITAR RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS EXISTENTES PARA RECREARLAS LIMPIAS
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_admin" ON user_subscriptions;

-- 4. CREAR POLÍTICAS LIMPIAS
-- Usuarios pueden ver solo su suscripción
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Usuarios pueden actualizar solo su suscripción
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

-- Usuarios pueden insertar solo su suscripción
CREATE POLICY "user_subscriptions_insert_own" ON user_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins pueden ver todas las suscripciones
CREATE POLICY "user_subscriptions_select_admin" ON user_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions admin_sub
            WHERE admin_sub.user_id = auth.uid()
            AND admin_sub.subscription_type = 'admin'
            AND admin_sub.status = 'active'
        )
    );

-- Admins pueden actualizar todas las suscripciones
CREATE POLICY "user_subscriptions_update_admin" ON user_subscriptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions admin_sub
            WHERE admin_sub.user_id = auth.uid()
            AND admin_sub.subscription_type = 'admin'
            AND admin_sub.status = 'active'
        )
    );

-- 5. FUNCIÓN: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER: Actualizar updated_at
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNCIÓN: Obtener información completa de suscripción (REEMPLAZAR)
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_data RECORD;
    current_period_start DATE;
    transaction_count INTEGER;
    budget_count INTEGER;
    category_count INTEGER;
    payment_method_count INTEGER;
    income_type_count INTEGER;
    recurring_count INTEGER;
    result JSON;
BEGIN
    -- Obtener suscripción del usuario
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    INTO subscription_data;
    
    -- Si no existe, crear suscripción FREE por defecto
    IF subscription_data IS NULL THEN
        INSERT INTO user_subscriptions (user_id, subscription_type, status)
        VALUES (user_uuid, 'free', 'active')
        RETURNING * INTO subscription_data;
    END IF;
    
    -- Calcular inicio del período actual (primer día del mes)
    current_period_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Contar transacciones del mes actual
    SELECT COALESCE(
        (SELECT COUNT(*) FROM gastos WHERE user_id = user_uuid AND DATE(fecha_gasto) >= current_period_start) +
        (SELECT COUNT(*) FROM ingresos WHERE user_id = user_uuid AND DATE(fecha_ingreso) >= current_period_start),
        0
    ) INTO transaction_count;
    
    -- Contar presupuestos activos
    SELECT COALESCE(
        (SELECT COUNT(*) FROM budgets WHERE user_id = user_uuid AND is_active = true),
        0
    ) INTO budget_count;
    
    -- Contar categorías personalizadas
    SELECT COALESCE(
        (SELECT COUNT(*) FROM categories WHERE user_id = user_uuid AND is_default = false),
        0
    ) INTO category_count;
    
    -- Contar métodos de pago personalizados
    SELECT COALESCE(
        (SELECT COUNT(*) FROM payment_methods WHERE user_id = user_uuid AND is_default = false),
        0
    ) INTO payment_method_count;
    
    -- Contar tipos de ingreso personalizados
    SELECT COALESCE(
        (SELECT COUNT(*) FROM income_types WHERE user_id = user_uuid AND is_default = false),
        0
    ) INTO income_type_count;
    
    -- Contar transacciones recurrentes activas
    SELECT COALESCE(
        (SELECT COUNT(*) FROM recurring_transactions WHERE user_id = user_uuid AND is_active = true),
        0
    ) INTO recurring_count;
    
    -- Construir respuesta JSON
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
                'current', transaction_count,
                'available', CASE 
                    WHEN subscription_data.monthly_transaction_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.monthly_transaction_limit - transaction_count) 
                END
            ),
            'budgets', json_build_object(
                'limit', subscription_data.budget_limit,
                'current', budget_count,
                'available', CASE 
                    WHEN subscription_data.budget_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.budget_limit - budget_count) 
                END
            ),
            'categories', json_build_object(
                'limit', subscription_data.custom_category_limit,
                'current', category_count,
                'available', CASE 
                    WHEN subscription_data.custom_category_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_category_limit - category_count) 
                END
            ),
            'payment_methods', json_build_object(
                'limit', subscription_data.custom_payment_method_limit,
                'current', payment_method_count,
                'available', CASE 
                    WHEN subscription_data.custom_payment_method_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_payment_method_limit - payment_method_count) 
                END
            ),
            'income_types', json_build_object(
                'limit', subscription_data.custom_income_type_limit,
                'current', income_type_count,
                'available', CASE 
                    WHEN subscription_data.custom_income_type_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.custom_income_type_limit - income_type_count) 
                END
            ),
            'recurring_transactions', json_build_object(
                'limit', subscription_data.recurring_transaction_limit,
                'current', recurring_count,
                'available', CASE 
                    WHEN subscription_data.recurring_transaction_limit = -1 THEN -1 
                    ELSE GREATEST(0, subscription_data.recurring_transaction_limit - recurring_count) 
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

-- 8. FUNCIÓN: Verificar límite específico
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

-- 9. FUNCIÓN: Hacer el usuario actual Admin (para desarrollo)
CREATE OR REPLACE FUNCTION make_current_user_admin()
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    result JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuario no autenticado');
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
        current_user_id, 'admin', 'active',
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
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a administrador exitosamente',
        'user_id', current_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. TRIGGER: Crear suscripción automática para nuevos usuarios
CREATE OR REPLACE FUNCTION create_user_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente y crear nuevo
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_subscription_on_signup();

-- ==============================================
-- VERIFICACIÓN: Mostrar estado del sistema
-- ==============================================

-- Mostrar información de la tabla creada
SELECT 'user_subscriptions table created successfully' as status;

-- Mostrar información del usuario actual
SELECT 
    'Current user info:' as info,
    auth.uid() as current_user_id,
    auth.email() as current_email;