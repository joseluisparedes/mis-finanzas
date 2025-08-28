-- CORREGIR LÓGICA DEL PLAN FAMILY
-- Family = Acceso gratuito completo, no tiene precio

-- 1. Corregir función safe_promote_to_family
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
    
    -- Promover a family (ACCESO GRATUITO COMPLETO)
    UPDATE user_subscriptions 
    SET subscription_type = 'family',
        status = 'active',
        price_paid = 0.00,  -- FAMILY ES GRATIS
        is_early_bird = false,  -- NO HAY EARLY BIRD PARA FAMILY
        early_bird_price = NULL,
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
           COALESCE(old_subscription, 'sin_suscripcion') || ' a Family (acceso completo gratuito)';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Corregir función safe_promote_to_premium con precios en SOLES
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
    
    -- Promover a premium (PRECIOS EN SOLES)
    UPDATE user_subscriptions 
    SET subscription_type = 'premium',
        status = 'active',
        price_paid = COALESCE((payment_info->>'price')::decimal, 
                             CASE WHEN (payment_info->>'is_early_bird')::boolean THEN 15.00 ELSE 50.00 END),
        is_early_bird = COALESCE((payment_info->>'is_early_bird')::boolean, false),
        early_bird_price = CASE 
            WHEN (payment_info->>'is_early_bird')::boolean THEN 15.00 
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
           COALESCE(old_subscription, 'sin_suscripcion') || ' a Premium (' ||
           CASE WHEN (payment_info->>'is_early_bird')::boolean THEN 'S/15 Early Bird' ELSE 'S/50' END || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

SELECT 'PLANES CORREGIDOS: Premium S/50 (EB S/15), Family Gratuito' as resultado;