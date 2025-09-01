-- Script para ejecutar todas las funcionalidades pendientes
-- ================================================================

-- 1. EJECUTAR SISTEMA DE FECHAS DE SUSCRIPCIÓN
-- ================================================================

-- Agregar columnas de fechas si no existen
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Actualizar registros existentes para tener fechas de inicio
UPDATE user_subscriptions 
SET subscription_start_date = COALESCE(started_at, created_at, NOW())
WHERE subscription_start_date IS NULL;

-- Función para calcular fecha de finalización basada en el tipo de plan
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
    start_date TIMESTAMP WITH TIME ZONE,
    subscription_type TEXT,
    billing_period TEXT DEFAULT 'monthly'
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Para planes gratuitos, no hay fecha de finalización
    IF subscription_type = 'free' OR subscription_type = 'family' THEN
        RETURN NULL;
    END IF;
    
    -- Para planes premium y early bird
    IF billing_period = 'annual' THEN
        RETURN start_date + INTERVAL '1 year';
    ELSE
        -- Por defecto mensual
        RETURN start_date + INTERVAL '1 month';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si una suscripción está próxima a vencer
CREATE OR REPLACE FUNCTION is_subscription_expiring_soon(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    subscription_record RECORD;
    days_until_expiry INTEGER;
    is_expiring BOOLEAN DEFAULT FALSE;
    warning_message TEXT;
BEGIN
    -- Obtener datos de suscripción
    SELECT * FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    LIMIT 1
    INTO subscription_record;
    
    -- Si no hay suscripción o es gratuita, no vence
    IF subscription_record IS NULL OR subscription_record.subscription_type IN ('free', 'family') THEN
        RETURN json_build_object(
            'is_expiring', false,
            'days_until_expiry', null,
            'warning_message', null,
            'subscription_end_date', null
        );
    END IF;
    
    -- Si no hay fecha de finalización, calcular
    IF subscription_record.subscription_end_date IS NULL THEN
        subscription_record.subscription_end_date := calculate_subscription_end_date(
            subscription_record.subscription_start_date,
            subscription_record.subscription_type,
            'monthly'
        );
        
        -- Actualizar la base de datos
        UPDATE user_subscriptions 
        SET subscription_end_date = subscription_record.subscription_end_date
        WHERE id = subscription_record.id;
    END IF;
    
    -- Calcular días hasta el vencimiento
    days_until_expiry := EXTRACT(DAY FROM (subscription_record.subscription_end_date - NOW()));
    
    -- Determinar si está próximo a vencer (3 días o menos)
    IF days_until_expiry <= 3 AND days_until_expiry >= 0 THEN
        is_expiring := TRUE;
        IF days_until_expiry = 0 THEN
            warning_message := 'Tu suscripción vence hoy. ¡Renueva ahora para mantener acceso completo!';
        ELSIF days_until_expiry = 1 THEN
            warning_message := 'Tu suscripción vence mañana. Renueva para evitar limitaciones.';
        ELSE
            warning_message := format('Tu suscripción vence en %s días. Considera renovar pronto.', days_until_expiry);
        END IF;
    ELSIF days_until_expiry < 0 THEN
        is_expiring := TRUE;
        warning_message := format('Tu suscripción venció hace %s días. Renueva para recuperar acceso completo.', ABS(days_until_expiry));
    END IF;
    
    RETURN json_build_object(
        'is_expiring', is_expiring,
        'days_until_expiry', days_until_expiry,
        'warning_message', warning_message,
        'subscription_end_date', subscription_record.subscription_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. EJECUTAR SISTEMA DE CAMPO CELULAR
-- ================================================================

-- Agregar campo de celular
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Función para que administradores actualicen el celular
CREATE OR REPLACE FUNCTION admin_update_user_phone(
    target_user_id UUID,
    new_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    affected_rows INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Actualizar o insertar perfil con número de teléfono
    INSERT INTO user_profiles (user_id, display_name, phone_number)
    VALUES (
        target_user_id, 
        COALESCE((SELECT email FROM auth.users WHERE id = target_user_id), ''),
        TRIM(new_phone_number)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        phone_number = TRIM(EXCLUDED.phone_number),
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Phone number updated for user %s', target_user_id),
        'new_phone_number', TRIM(new_phone_number)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. EJECUTAR SISTEMA DE TRACKING DE CONTACTOS
-- ================================================================

-- Crear tabla para el registro de contactos
CREATE TABLE IF NOT EXISTS admin_contact_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'whatsapp', 'phone', 'other')),
    contact_reason TEXT,
    contact_notes TEXT,
    contact_successful BOOLEAN DEFAULT true,
    response_received BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_target_user ON admin_contact_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_admin_user ON admin_contact_log(admin_user_id);

-- RLS
ALTER TABLE admin_contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contact logs" ON admin_contact_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND (us.subscription_type = 'admin' OR us.is_admin = true)
        )
    );

-- Función para registrar contacto
CREATE OR REPLACE FUNCTION log_admin_contact(
    target_user_id UUID,
    contact_method TEXT,
    contact_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    contact_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    INSERT INTO admin_contact_log (
        target_user_id, admin_user_id, contact_method, contact_reason
    )
    VALUES (
        target_user_id, current_user_id, contact_method, contact_reason
    )
    RETURNING id INTO contact_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contact logged successfully',
        'contact_id', contact_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. SISTEMA DE EXTENSIONES DE SUSCRIPCIÓN
-- ================================================================

-- Función para extender suscripción
CREATE OR REPLACE FUNCTION extend_user_subscription(
    target_user_id UUID,
    extension_period TEXT, -- '30_days' o '1_year'
    notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    user_subscription RECORD;
    new_end_date TIMESTAMP WITH TIME ZONE;
    extension_months INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar permisos de admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Obtener suscripción actual
    SELECT * FROM user_subscriptions 
    WHERE user_id = target_user_id 
    INTO user_subscription;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User subscription not found';
    END IF;
    
    -- Calcular nueva fecha de finalización
    IF user_subscription.subscription_end_date IS NULL THEN
        -- Si no tiene fecha de fin, empezar desde ahora
        IF extension_period = '30_days' THEN
            new_end_date := NOW() + INTERVAL '30 days';
        ELSIF extension_period = '1_year' THEN
            new_end_date := NOW() + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Invalid extension period. Use: 30_days or 1_year';
        END IF;
    ELSE
        -- Extender desde la fecha actual de finalización
        IF extension_period = '30_days' THEN
            new_end_date := user_subscription.subscription_end_date + INTERVAL '30 days';
        ELSIF extension_period = '1_year' THEN
            new_end_date := user_subscription.subscription_end_date + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Invalid extension period. Use: 30_days or 1_year';
        END IF;
    END IF;
    
    -- Actualizar suscripción
    UPDATE user_subscriptions 
    SET 
        subscription_end_date = new_end_date,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Log del cambio (si existe tabla de audit)
    BEGIN
        INSERT INTO subscription_change_log (
            user_id, admin_user_id, change_type, old_end_date, new_end_date, notes
        ) VALUES (
            target_user_id, current_user_id, 'extension', 
            user_subscription.subscription_end_date, new_end_date, 
            COALESCE(notes, format('Extended subscription by %s', extension_period))
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Tabla de log no existe aún, continuar sin error
            NULL;
    END;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Subscription extended by %s', extension_period),
        'old_end_date', user_subscription.subscription_end_date,
        'new_end_date', new_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. SISTEMA DE LOG DE CAMBIOS DE PLAN
-- ================================================================

-- Crear tabla de log de cambios
CREATE TABLE IF NOT EXISTS subscription_change_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Información del cambio
    change_type TEXT NOT NULL CHECK (change_type IN ('promotion', 'demotion', 'extension', 'activation', 'deactivation')),
    old_subscription_type TEXT,
    new_subscription_type TEXT,
    old_end_date TIMESTAMP WITH TIME ZONE,
    new_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Detalles adicionales
    notes TEXT,
    payment_info JSON,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_user_id ON subscription_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_admin_user_id ON subscription_change_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_created_at ON subscription_change_log(created_at);

-- RLS
ALTER TABLE subscription_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all subscription changes" ON subscription_change_log 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND (us.subscription_type = 'admin' OR us.is_admin = true)
        )
    );

-- Función para obtener historial de cambios
CREATE OR REPLACE FUNCTION get_subscription_change_history(
    target_user_id UUID DEFAULT NULL,
    limit_records INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    user_email TEXT,
    admin_email TEXT,
    change_type TEXT,
    old_subscription_type TEXT,
    new_subscription_type TEXT,
    old_end_date TIMESTAMP WITH TIME ZONE,
    new_end_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    SELECT (us.subscription_type = 'admin' OR us.is_admin = true) FROM user_subscriptions us
    WHERE us.user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    RETURN QUERY
    SELECT 
        scl.id,
        target_user.email as user_email,
        admin_user.email as admin_email,
        scl.change_type,
        scl.old_subscription_type,
        scl.new_subscription_type,
        scl.old_end_date,
        scl.new_end_date,
        scl.notes,
        scl.created_at
    FROM subscription_change_log scl
    LEFT JOIN auth.users target_user ON scl.user_id = target_user.id
    LEFT JOIN auth.users admin_user ON scl.admin_user_id = admin_user.id
    WHERE (target_user_id IS NULL OR scl.user_id = target_user_id)
    ORDER BY scl.created_at DESC
    LIMIT limit_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. PERMISOS Y MENSAJES FINALES
-- ================================================================

-- Otorgar permisos a las nuevas funciones
GRANT EXECUTE ON FUNCTION calculate_subscription_end_date(TIMESTAMP WITH TIME ZONE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscription_expiring_soon(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_phone(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_contact(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_user_subscription(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_change_history(UUID, INTEGER) TO authenticated;

-- Mensajes de confirmación
SELECT 'All systems have been successfully implemented!' as status;
SELECT 'Features: Subscription dates, phone field, contact tracking, extensions, change log' as features;
SELECT 'Ready for frontend integration' as next_step;