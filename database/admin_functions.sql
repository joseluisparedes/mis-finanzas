-- ======================================================
-- FUNCIONES ADMINISTRATIVAS PARA GESTIÓN DE USUARIOS
-- ======================================================

-- 1. Actualizar ENUM para incluir 'family'
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_subscription_type_check;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_subscription_type_check 
CHECK (subscription_type IN ('free', 'premium', 'family', 'admin'));

-- 2. Actualizar función set_subscription_limits para incluir family
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
            
        WHEN 'family' THEN
            -- Mismo acceso que Premium pero GRATIS
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
                advanced_reports_enabled = true,
                price_paid = 0.00, -- GRATIS
                billing_period = null -- No aplica facturación
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

-- 3. Función para obtener todas las suscripciones (para admins)
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
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
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

-- 4. Función para obtener estadísticas de suscripciones
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
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Contar usuarios por tipo
    SELECT COUNT(*) INTO total_users FROM user_subscriptions;
    SELECT COUNT(*) INTO free_users FROM user_subscriptions WHERE subscription_type = 'free';
    SELECT COUNT(*) INTO premium_users FROM user_subscriptions WHERE subscription_type = 'premium';
    SELECT COUNT(*) INTO family_users FROM user_subscriptions WHERE subscription_type = 'family';
    SELECT COUNT(*) INTO admin_users FROM user_subscriptions WHERE subscription_type = 'admin';
    SELECT COUNT(*) INTO active_subscriptions FROM user_subscriptions WHERE status = 'active';
    SELECT COUNT(*) INTO early_bird_users FROM user_subscriptions WHERE is_early_bird = true;
    
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

-- 5. Función para cambiar suscripción de usuario
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
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
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
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuario no encontrado'
        );
    END IF;
    
    -- Actualizar suscripción
    UPDATE user_subscriptions 
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
    WHERE user_id = target_user_id;
    
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

-- 6. Función para promover usuario a premium
CREATE OR REPLACE FUNCTION upgrade_user_to_premium(
    target_user_id UUID,
    payment_info JSON
)
RETURNS JSON AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Actualizar a premium
    UPDATE user_subscriptions 
    SET 
        subscription_type = 'premium',
        status = 'active',
        price_paid = (payment_info->>'price')::DECIMAL,
        billing_period = payment_info->>'billing_period',
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::BOOLEAN, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::BOOLEAN = true THEN (payment_info->>'price')::DECIMAL
            ELSE NULL
        END,
        payment_method = payment_info->>'payment_method',
        transaction_id = payment_info->>'transaction_id',
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Aplicar límites premium
    PERFORM set_subscription_limits('premium', target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a Premium exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para degradar usuario a free
CREATE OR REPLACE FUNCTION downgrade_user_to_free(target_user_id UUID)
RETURNS JSON AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = auth.uid() AND subscription_type = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Actualizar a free
    UPDATE user_subscriptions 
    SET 
        subscription_type = 'free',
        status = 'active',
        price_paid = 0.00,
        billing_period = null,
        is_early_bird = false,
        early_bird_price = null,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Aplicar límites free
    PERFORM set_subscription_limits('free', target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario degradado a Free exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Promover mi usuario a admin (solo para configuración inicial)
CREATE OR REPLACE FUNCTION promote_myself_to_admin()
RETURNS JSON AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Obtener email del usuario actual
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
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
-- PERMISOS Y COMENTARIOS
-- ======================================================

-- Permitir ejecución de funciones RPC desde el cliente
GRANT EXECUTE ON FUNCTION get_all_subscriptions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_user_subscription(TEXT, TEXT, JSON) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_premium(UUID, JSON) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION downgrade_user_to_free(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_myself_to_admin() TO anon, authenticated;

-- Comentarios
COMMENT ON FUNCTION get_all_subscriptions IS 'Obtiene todas las suscripciones (solo para admins)';
COMMENT ON FUNCTION get_subscription_stats IS 'Obtiene estadísticas de suscripciones (solo para admins)';
COMMENT ON FUNCTION change_user_subscription IS 'Cambia el tipo de suscripción de un usuario (solo para admins)';
COMMENT ON FUNCTION promote_myself_to_admin IS 'Función especial para que jose241100@gmail.com se promueva a admin';