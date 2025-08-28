-- CORREGIR FUNCIÓN PARA USAR VALORES PERMITIDOS
-- Ejecutar para corregir el error de constraint

-- 1. Ver valores actuales permitidos
SELECT DISTINCT subscription_type FROM user_subscriptions;

-- 2. Corregir función safe_promote_to_premium
CREATE OR REPLACE FUNCTION safe_promote_to_premium(target_user_id UUID, payment_info JSONB DEFAULT '{}'::jsonb)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
    old_subscription TEXT;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Obtener datos del usuario objetivo
    SELECT au.email, us.subscription_type
    INTO target_email, old_subscription
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario no encontrado';
    END IF;
    
    -- PROTECCIÓN: No tocar a José
    IF target_user_id = jose_id THEN
        RETURN 'BLOQUEADO: No se puede cambiar la suscripción del administrador principal';
    END IF;
    
    -- Promover a premium (USAR 'premium' en lugar de 'premium_monthly')
    UPDATE user_subscriptions 
    SET subscription_type = 'premium',  -- CORREGIDO: usar 'premium'
        status = 'active',
        price_paid = COALESCE((payment_info->>'amount')::decimal, 15.00),
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::boolean THEN 5.00 
            ELSE NULL 
        END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Verificar que José sigue siendo admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = jose_id AND subscription_type = 'admin'
    ) THEN
        UPDATE user_subscriptions 
        SET subscription_type = 'admin', status = 'active', updated_at = NOW()
        WHERE user_id = jose_id;
    END IF;
    
    RETURN 'ÉXITO: ' || target_email || ' promovido de ' || 
           COALESCE(old_subscription, 'sin_suscripcion') || ' a premium';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para promover a family también
CREATE OR REPLACE FUNCTION safe_promote_to_family(target_user_id UUID, payment_info JSONB DEFAULT '{}'::jsonb)
RETURNS TEXT AS $$
DECLARE
    target_email TEXT;
    jose_id UUID;
    old_subscription TEXT;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Obtener datos del usuario objetivo
    SELECT au.email, us.subscription_type
    INTO target_email, old_subscription
    FROM auth.users au
    LEFT JOIN user_subscriptions us ON au.id = us.user_id
    WHERE au.id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN 'ERROR: Usuario no encontrado';
    END IF;
    
    -- PROTECCIÓN: No tocar a José
    IF target_user_id = jose_id THEN
        RETURN 'BLOQUEADO: No se puede cambiar la suscripción del administrador principal';
    END IF;
    
    -- Promover a family
    UPDATE user_subscriptions 
    SET subscription_type = 'family',
        status = 'active',
        price_paid = COALESCE((payment_info->>'amount')::decimal, 25.00),
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::boolean THEN 10.00 
            ELSE NULL 
        END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    -- Verificar que José sigue siendo admin
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = jose_id AND subscription_type = 'admin'
    ) THEN
        UPDATE user_subscriptions 
        SET subscription_type = 'admin', status = 'active', updated_at = NOW()
        WHERE user_id = jose_id;
    END IF;
    
    RETURN 'ÉXITO: ' || target_email || ' promovido de ' || 
           COALESCE(old_subscription, 'sin_suscripcion') || ' a family';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permisos
GRANT EXECUTE ON FUNCTION safe_promote_to_family(UUID, JSONB) TO authenticated;

-- 5. Verificar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

SELECT 'FUNCIONES CORREGIDAS - Ahora usa premium y family en lugar de premium_monthly' as resultado;