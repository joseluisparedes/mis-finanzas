-- ======================================================
-- CORRECCIÓN DE FUNCIONES RPC CON AMBIGÜEDAD DE COLUMNAS
-- ======================================================

-- 1. Actualizar ENUM para incluir 'family' si no existe
DO $$
BEGIN
    -- Intentar agregar 'family' al constraint
    BEGIN
        ALTER TABLE user_subscriptions 
        DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_type_check;
        
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_subscription_type_check 
        CHECK (subscription_type IN ('free', 'premium', 'family', 'admin'));
        
        RAISE NOTICE 'Constraint actualizado para incluir family';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error actualizando constraint: %', SQLERRM;
    END;
END $$;

-- 2. Función corregida para obtener todas las suscripciones (sin ambigüedad)
CREATE OR REPLACE FUNCTION get_all_subscriptions()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    subscription_type TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    price_paid DECIMAL,
    billing_period TEXT,
    is_early_bird BOOLEAN,
    early_bird_price DECIMAL,
    notes TEXT,
    created_at TIMESTAMPTZ,
    users JSONB
) AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions us_check
        WHERE us_check.user_id = auth.uid() AND us_check.subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        us.id,
        us.user_id,
        us.subscription_type,
        us.status,
        us.started_at,
        us.expires_at,
        us.price_paid,
        us.billing_period,
        us.is_early_bird,
        us.early_bird_price,
        us.notes,
        us.created_at,
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'created_at', u.created_at
        ) as users
    FROM user_subscriptions us
    LEFT JOIN auth.users u ON us.user_id = u.id
    ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función corregida para obtener estadísticas
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_users INTEGER;
    free_users INTEGER;
    premium_users INTEGER;
    family_users INTEGER;
    admin_users INTEGER;
    active_subscriptions INTEGER;
    early_bird_users INTEGER;
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions us_check
        WHERE us_check.user_id = auth.uid() AND us_check.subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Contar usuarios por tipo (usando alias para evitar ambigüedad)
    SELECT COUNT(*) INTO total_users FROM user_subscriptions us1;
    SELECT COUNT(*) INTO free_users FROM user_subscriptions us2 WHERE us2.subscription_type = 'free';
    SELECT COUNT(*) INTO premium_users FROM user_subscriptions us3 WHERE us3.subscription_type = 'premium';
    SELECT COUNT(*) INTO family_users FROM user_subscriptions us4 WHERE us4.subscription_type = 'family';
    SELECT COUNT(*) INTO admin_users FROM user_subscriptions us5 WHERE us5.subscription_type = 'admin';
    SELECT COUNT(*) INTO active_subscriptions FROM user_subscriptions us6 WHERE us6.status = 'active';
    SELECT COUNT(*) INTO early_bird_users FROM user_subscriptions us7 WHERE us7.is_early_bird = true;
    
    SELECT json_build_object(
        'total_users', total_users,
        'free_users', free_users,
        'premium_users', premium_users,
        'family_users', family_users,
        'admin_users', admin_users,
        'active_subscriptions', active_subscriptions,
        'early_bird_users', early_bird_users
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para cambiar suscripción de usuario (corregida)
CREATE OR REPLACE FUNCTION change_user_subscription(
    target_user_email TEXT,
    new_subscription_type TEXT,
    payment_info JSON DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    result JSON;
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions us_check
        WHERE us_check.user_id = auth.uid() AND us_check.subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Validar tipo de suscripción
    IF new_subscription_type NOT IN ('free', 'premium', 'family', 'admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Tipo de suscripción inválido'
        );
    END IF;
    
    -- Buscar el usuario por email
    SELECT u.id INTO target_user_id 
    FROM auth.users u
    WHERE u.email = target_user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Actualizar suscripción
    UPDATE user_subscriptions us_update
    SET 
        subscription_type = new_subscription_type,
        status = 'active',
        price_paid = COALESCE((payment_info->>'price')::DECIMAL, 0.00),
        billing_period = payment_info->>'billing_period',
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::BOOLEAN, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::BOOLEAN = true THEN (payment_info->>'price')::DECIMAL
            ELSE NULL
        END,
        notes = payment_info->>'notes',
        updated_at = NOW()
    WHERE us_update.user_id = target_user_id;
    
    -- Aplicar límites del nuevo plan
    PERFORM set_subscription_limits(new_subscription_type, target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Suscripción actualizada exitosamente',
        'user_id', target_user_id,
        'new_type', new_subscription_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar función set_subscription_limits para incluir family
CREATE OR REPLACE FUNCTION set_subscription_limits(
    sub_type TEXT,
    user_uuid UUID
)
RETURNS VOID AS $$
BEGIN
    CASE sub_type
        WHEN 'free' THEN
            UPDATE user_subscriptions us_update SET
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
            WHERE us_update.user_id = user_uuid;
            
        WHEN 'premium' THEN
            UPDATE user_subscriptions us_update SET
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
            WHERE us_update.user_id = user_uuid;
            
        WHEN 'family' THEN
            -- Mismo acceso que Premium pero GRATIS
            UPDATE user_subscriptions us_update SET
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
                advanced_reports_enabled = true,
                price_paid = 0.00, -- GRATIS
                billing_period = null -- No aplica facturación
            WHERE us_update.user_id = user_uuid;
            
        WHEN 'admin' THEN
            UPDATE user_subscriptions us_update SET
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
            WHERE us_update.user_id = user_uuid;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función especial para promoverse a admin (solo jose241100@gmail.com)
CREATE OR REPLACE FUNCTION promote_myself_to_admin()
RETURNS JSON AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Obtener email del usuario actual
    SELECT u.email INTO current_user_email 
    FROM auth.users u
    WHERE u.id = auth.uid();
    
    -- Solo permitir para jose241100@gmail.com
    IF current_user_email != 'jose241100@gmail.com' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No autorizado para auto-promoción a admin'
        );
    END IF;
    
    -- Crear o actualizar suscripción admin
    INSERT INTO user_subscriptions (user_id, subscription_type, status) 
    VALUES (auth.uid(), 'admin', 'active')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        subscription_type = 'admin',
        status = 'active',
        updated_at = NOW();
    
    -- Aplicar límites admin
    PERFORM set_subscription_limits('admin', auth.uid());
    
    RETURN json_build_object(
        'success', true,
        'message', 'Promovido a admin exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================
-- PERMISOS 
-- ======================================================
-- Permitir ejecución de funciones RPC desde el cliente
GRANT EXECUTE ON FUNCTION get_all_subscriptions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_user_subscription(TEXT, TEXT, JSON) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_myself_to_admin() TO anon, authenticated;

-- ======================================================
-- MENSAJE FINAL
-- ======================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Funciones RPC corregidas exitosamente sin ambigüedad de columnas';
    RAISE NOTICE '🔄 Ahora ejecuta: supabase.rpc(''promote_myself_to_admin'')';
END $$;