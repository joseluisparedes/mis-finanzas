-- ==============================================
-- SISTEMA DE SUSCRIPCIONES Y ROLES v1.0
-- Tabla: user_subscriptions
-- ==============================================

-- ==============================================
-- 1. TABLA DE SUSCRIPCIONES DE USUARIO
-- ==============================================
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
    
    -- RESTRICCIONES POR PLAN
    -- FREE PLAN LIMITS
    monthly_transaction_limit INTEGER DEFAULT 30, -- 30 transacciones/mes
    budget_limit INTEGER DEFAULT 2, -- 2 presupuestos
    custom_category_limit INTEGER DEFAULT 3, -- 3 categorías personalizadas
    custom_payment_method_limit INTEGER DEFAULT 2, -- 2 métodos de pago
    custom_income_type_limit INTEGER DEFAULT 1, -- 1 tipo de ingreso
    recurring_transaction_limit INTEGER DEFAULT 5, -- 5 recurrentes
    report_months_limit INTEGER DEFAULT 3, -- Solo últimos 3 meses
    multi_currency_enabled BOOLEAN DEFAULT false, -- Solo PEN
    excel_export_enabled BOOLEAN DEFAULT false, -- Solo CSV básico
    excel_import_enabled BOOLEAN DEFAULT false, -- Sin importar
    advanced_reports_enabled BOOLEAN DEFAULT false, -- Sin reportes avanzados
    
    -- METADATA
    is_early_bird BOOLEAN DEFAULT false, -- Precio fundador S/ 5
    early_bird_price DECIMAL(10,2), -- Precio bloqueado para siempre
    referral_code TEXT,
    notes TEXT,
    
    -- AUDITORÍA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ==============================================
-- 2. CONFIGURACIONES PREDETERMINADAS POR PLAN
-- ==============================================

-- Función para aplicar límites según el plan
CREATE OR REPLACE FUNCTION set_subscription_limits(
    sub_type TEXT,
    user_uuid UUID
)
RETURNS VOID AS $$
BEGIN
    CASE sub_type
        WHEN 'free' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = 30,
                budget_limit = 2,
                custom_category_limit = 3,
                custom_payment_method_limit = 2,
                custom_income_type_limit = 1,
                recurring_transaction_limit = 5,
                report_months_limit = 3,
                multi_currency_enabled = false,
                excel_export_enabled = false,
                excel_import_enabled = false,
                advanced_reports_enabled = false
            WHERE user_id = user_uuid;
            
        WHEN 'premium' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = -1, -- Ilimitado
                budget_limit = -1, -- Ilimitado
                custom_category_limit = -1, -- Ilimitado
                custom_payment_method_limit = -1, -- Ilimitado
                custom_income_type_limit = -1, -- Ilimitado
                recurring_transaction_limit = -1, -- Ilimitado
                report_months_limit = -1, -- Sin límite
                multi_currency_enabled = true,
                excel_export_enabled = true,
                excel_import_enabled = true,
                advanced_reports_enabled = true
            WHERE user_id = user_uuid;
            
        WHEN 'admin' THEN
            UPDATE user_subscriptions SET
                monthly_transaction_limit = -1, -- Ilimitado
                budget_limit = -1, -- Ilimitado
                custom_category_limit = -1, -- Ilimitado
                custom_payment_method_limit = -1, -- Ilimitado
                custom_income_type_limit = -1, -- Ilimitado
                recurring_transaction_limit = -1, -- Ilimitado
                report_months_limit = -1, -- Sin límite
                multi_currency_enabled = true,
                excel_export_enabled = true,
                excel_import_enabled = true,
                advanced_reports_enabled = true
            WHERE user_id = user_uuid;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 3. FUNCIÓN PARA OBTENER INFORMACIÓN COMPLETA DE SUSCRIPCIÓN
-- ==============================================
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_record RECORD;
    current_month_transactions INTEGER;
    current_budgets INTEGER;
    current_categories INTEGER;
    current_payment_methods INTEGER;
    current_income_types INTEGER;
    current_recurring INTEGER;
    result JSON;
BEGIN
    -- Obtener información de suscripción
    SELECT * INTO subscription_record 
    FROM user_subscriptions 
    WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Subscription not found');
    END IF;
    
    -- Contar transacciones del mes actual
    SELECT COUNT(*) INTO current_month_transactions
    FROM (
        SELECT id FROM expenses 
        WHERE user_id = user_uuid 
        AND date >= date_trunc('month', CURRENT_DATE)
        UNION ALL
        SELECT id FROM incomes 
        WHERE user_id = user_uuid 
        AND date >= date_trunc('month', CURRENT_DATE)
    ) AS all_transactions;
    
    -- Contar recursos actuales
    SELECT COUNT(*) INTO current_budgets FROM budgets WHERE user_id = user_uuid AND is_active = true;
    SELECT COUNT(*) INTO current_categories FROM categories WHERE user_id = user_uuid AND is_active = true;
    SELECT COUNT(*) INTO current_payment_methods FROM payment_methods WHERE user_id = user_uuid AND is_active = true;
    SELECT COUNT(*) INTO current_income_types FROM income_types WHERE user_id = user_uuid AND is_active = true;
    SELECT COUNT(*) INTO current_recurring FROM recurring_expenses WHERE user_id = user_uuid AND is_active = true;
    
    -- Construir respuesta completa
    SELECT json_build_object(
        'subscription', json_build_object(
            'id', subscription_record.id,
            'user_id', subscription_record.user_id,
            'type', subscription_record.subscription_type,
            'status', subscription_record.status,
            'started_at', subscription_record.started_at,
            'expires_at', subscription_record.expires_at,
            'is_early_bird', subscription_record.is_early_bird,
            'early_bird_price', subscription_record.early_bird_price
        ),
        'limits', json_build_object(
            'monthly_transactions', json_build_object(
                'limit', subscription_record.monthly_transaction_limit,
                'current', current_month_transactions,
                'available', CASE 
                    WHEN subscription_record.monthly_transaction_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.monthly_transaction_limit - current_month_transactions)
                END
            ),
            'budgets', json_build_object(
                'limit', subscription_record.budget_limit,
                'current', current_budgets,
                'available', CASE 
                    WHEN subscription_record.budget_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.budget_limit - current_budgets)
                END
            ),
            'categories', json_build_object(
                'limit', subscription_record.custom_category_limit,
                'current', current_categories,
                'available', CASE 
                    WHEN subscription_record.custom_category_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.custom_category_limit - current_categories)
                END
            ),
            'payment_methods', json_build_object(
                'limit', subscription_record.custom_payment_method_limit,
                'current', current_payment_methods,
                'available', CASE 
                    WHEN subscription_record.custom_payment_method_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.custom_payment_method_limit - current_payment_methods)
                END
            ),
            'income_types', json_build_object(
                'limit', subscription_record.custom_income_type_limit,
                'current', current_income_types,
                'available', CASE 
                    WHEN subscription_record.custom_income_type_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.custom_income_type_limit - current_income_types)
                END
            ),
            'recurring_transactions', json_build_object(
                'limit', subscription_record.recurring_transaction_limit,
                'current', current_recurring,
                'available', CASE 
                    WHEN subscription_record.recurring_transaction_limit = -1 THEN -1
                    ELSE GREATEST(0, subscription_record.recurring_transaction_limit - current_recurring)
                END
            )
        ),
        'features', json_build_object(
            'multi_currency_enabled', subscription_record.multi_currency_enabled,
            'excel_export_enabled', subscription_record.excel_export_enabled,
            'excel_import_enabled', subscription_record.excel_import_enabled,
            'advanced_reports_enabled', subscription_record.advanced_reports_enabled,
            'report_months_limit', subscription_record.report_months_limit
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 4. FUNCIÓN PARA VERIFICAR LÍMITES ANTES DE CREAR
-- ==============================================
CREATE OR REPLACE FUNCTION check_user_limit(
    user_uuid UUID,
    limit_type TEXT -- 'transaction', 'budget', 'category', etc.
)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_info JSON;
    limit_info JSON;
    available INTEGER;
BEGIN
    -- Obtener información de límites
    SELECT get_user_subscription_info(user_uuid) INTO subscription_info;
    
    -- Extraer información del límite específico
    limit_info := subscription_info->'limits'->(limit_type || 's');
    available := (limit_info->>'available')::INTEGER;
    
    -- -1 significa ilimitado, >0 significa disponible
    RETURN (available = -1 OR available > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. ÍNDICES Y OPTIMIZACIÓN
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_type ON user_subscriptions(subscription_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- ==============================================
-- 6. ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todo
CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- Usuarios pueden ver solo su suscripción
CREATE POLICY "Users can view own subscription" ON user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

-- Solo admins pueden insertar suscripciones
CREATE POLICY "Admins can insert subscriptions" ON user_subscriptions 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- Solo admins pueden actualizar suscripciones
CREATE POLICY "Admins can update subscriptions" ON user_subscriptions 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND us.subscription_type = 'admin'
        )
    );

-- ==============================================
-- 7. TRIGGERS
-- ==============================================

-- Trigger para updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 8. MODIFICAR FUNCIÓN create_default_user_data
-- ==============================================
-- Actualizar la función existente para crear suscripción por defecto

CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear configuración por defecto
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    
    -- Crear suscripción FREE por defecto
    INSERT INTO user_subscriptions (user_id, subscription_type, status) 
    VALUES (NEW.id, 'free', 'active');
    
    -- Aplicar límites del plan FREE
    PERFORM set_subscription_limits('free', NEW.id);
    
    -- Crear categorías por defecto (limitadas por plan FREE: 3 personalizadas + predefinidas)
    INSERT INTO categories (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Comida', '#FF6B6B', 1),
        (NEW.id, 'Transporte', '#4ECDC4', 2),
        (NEW.id, 'Entretenimiento', '#45B7D1', 3),
        (NEW.id, 'Servicios', '#96CEB4', 4),
        (NEW.id, 'Compras', '#FFEAA7', 5);
    
    -- Crear métodos de pago por defecto (limitados por plan FREE: 2 personalizados)
    INSERT INTO payment_methods (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Efectivo', '#74B9FF', 1),
        (NEW.id, 'Tarjeta de Débito', '#0984E3', 2),
        (NEW.id, 'Tarjeta de Crédito', '#6C5CE7', 3),
        (NEW.id, 'Transferencia', '#A29BFE', 4);
    
    -- Crear tipos de ingresos por defecto (limitados por plan FREE: 1 personalizado)
    INSERT INTO income_types (user_id, name, color, sort_order) VALUES
        (NEW.id, 'Salario Principal', '#00B894', 1),
        (NEW.id, 'Salario Secundario', '#00CEC9', 2),
        (NEW.id, 'Ingresos Adicionales', '#55A3FF', 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 9. FUNCIÓN PARA PROMOVER USUARIO A ADMIN
-- ==============================================
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    result JSON;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Actualizar a admin
    UPDATE user_subscriptions 
    SET 
        subscription_type = 'admin',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Aplicar límites de admin (ilimitado)
    PERFORM set_subscription_limits('admin', target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a admin exitosamente',
        'user_id', target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMENTARIOS
-- ==============================================
COMMENT ON TABLE user_subscriptions IS 'Suscripciones y roles de usuario con límites por plan';
COMMENT ON FUNCTION get_user_subscription_info IS 'Obtiene información completa de suscripción y límites actuales';
COMMENT ON FUNCTION check_user_limit IS 'Verifica si el usuario puede crear más recursos según su plan';
COMMENT ON FUNCTION set_subscription_limits IS 'Aplica límites predeterminados según el tipo de suscripción';
COMMENT ON FUNCTION promote_user_to_admin IS 'Función para promover usuario a administrador';