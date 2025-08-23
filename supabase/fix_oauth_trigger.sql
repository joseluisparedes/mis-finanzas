-- ======================================================
-- CORRECCIÓN DEL TRIGGER PARA OAUTH - USUARIOS NUEVOS
-- ======================================================

-- 1. Verificar si la función update_updated_at_column existe, si no, crearla
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Asegurar que la tabla user_subscriptions existe con la estructura correcta
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- INFORMACIÓN DE SUSCRIPCIÓN
    subscription_type TEXT NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'family', 'admin')),
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
    
    UNIQUE(user_id)
);

-- 3. Función para crear datos por defecto del usuario (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION create_default_user_data()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        -- Crear suscripción FREE por defecto
        INSERT INTO user_subscriptions (user_id, subscription_type, status) 
        VALUES (NEW.id, 'free', 'active');
        
        RAISE LOG 'Default subscription created for user: %', NEW.id;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'Subscription already exists for user: %', NEW.id;
        WHEN OTHERS THEN
            RAISE LOG 'Error creating subscription for user %: %', NEW.id, SQLERRM;
            -- No fallar el registro del usuario, solo logear el error
    END;
    
    -- Intentar crear user_settings si la tabla existe
    BEGIN
        INSERT INTO user_settings (user_id) VALUES (NEW.id);
        RAISE LOG 'User settings created for user: %', NEW.id;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE LOG 'user_settings table does not exist, skipping';
        WHEN unique_violation THEN
            RAISE LOG 'User settings already exist for user: %', NEW.id;
        WHEN OTHERS THEN
            RAISE LOG 'Error creating user settings for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Eliminar trigger existente si existe y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_data();

-- 5. Habilitar RLS en user_subscriptions si no está habilitado
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS básicas para user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;

CREATE POLICY "Users can view own subscription" ON user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON user_subscriptions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Función para promoverse a admin (solo jose241100@gmail.com)
CREATE OR REPLACE FUNCTION promote_myself_to_admin()
RETURNS JSONB AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Obtener email del usuario actual
    SELECT u.email INTO current_user_email 
    FROM auth.users u
    WHERE u.id = auth.uid();
    
    -- Solo permitir para jose241100@gmail.com
    IF current_user_email != 'jose241100@gmail.com' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No autorizado para auto-promoción a admin'
        );
    END IF;
    
    -- Actualizar a admin
    UPDATE user_subscriptions 
    SET 
        subscription_type = 'admin',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Promovido a admin exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Permisos para la función
GRANT EXECUTE ON FUNCTION promote_myself_to_admin() TO anon, authenticated;

-- ======================================================
-- MENSAJE FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger OAuth corregido exitosamente';
    RAISE NOTICE '🔄 Ahora el registro OAuth debería funcionar sin errores';
    RAISE NOTICE '👤 Para hacerte admin ejecuta: SELECT promote_myself_to_admin()';
END $$;