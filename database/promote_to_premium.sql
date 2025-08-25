-- ==============================================
-- PROMOVER USUARIOS A PREMIUM
-- ==============================================

-- OPCIÓN 1: Promover usuario específico a Premium Early Bird
UPDATE user_subscriptions 
SET 
  subscription_type = 'premium',
  status = 'active',
  is_early_bird = true,
  early_bird_price = 5.00,
  price_paid = 5.00,
  currency = 'PEN',
  billing_period = 'monthly',
  payment_method = 'manual_admin',
  transaction_id = 'ADMIN_PROMOTION_' || extract(epoch from now())::text,
  started_at = NOW(),
  expires_at = NOW() + INTERVAL '30 days', -- Mensual
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com'
);

-- Aplicar límites Premium (ilimitado)
SELECT set_subscription_limits(
  'premium', 
  (SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com')
);

-- OPCIÓN 2: Promover a Premium Regular (precio completo)
UPDATE user_subscriptions 
SET 
  subscription_type = 'premium',
  status = 'active',
  is_early_bird = false,
  early_bird_price = NULL,
  price_paid = 15.00,
  currency = 'PEN',
  billing_period = 'monthly',
  payment_method = 'manual_admin',
  transaction_id = 'ADMIN_PROMOTION_' || extract(epoch from now())::text,
  started_at = NOW(),
  expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com'
);

-- Aplicar límites Premium
SELECT set_subscription_limits(
  'premium', 
  (SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com')
);

-- OPCIÓN 3: Premium Anual (con descuento)
UPDATE user_subscriptions 
SET 
  subscription_type = 'premium',
  status = 'active',
  is_early_bird = true,
  early_bird_price = 5.00, -- Precio mensual equivalente
  price_paid = 60.00, -- 5 * 12 meses
  currency = 'PEN',
  billing_period = 'yearly',
  payment_method = 'manual_admin',
  transaction_id = 'ADMIN_YEARLY_' || extract(epoch from now())::text,
  started_at = NOW(),
  expires_at = NOW() + INTERVAL '365 days',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com'
);

-- Aplicar límites Premium
SELECT set_subscription_limits(
  'premium', 
  (SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_USUARIO@gmail.com')
);

-- VERIFICAR QUE FUNCIONÓ
SELECT 
  u.email,
  us.subscription_type,
  us.status,
  us.is_early_bird,
  us.price_paid,
  us.billing_period,
  us.started_at,
  us.expires_at,
  us.monthly_transaction_limit,
  us.multi_currency_enabled,
  us.excel_export_enabled
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'EMAIL_DEL_USUARIO@gmail.com';

-- CONTAR USUARIOS PREMIUM
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE is_early_bird = true AND subscription_type = 'premium') as early_bird_users
FROM user_subscriptions;

-- FUNCIÓN RÁPIDA PARA PROMOVER (solo reemplaza el email)
CREATE OR REPLACE FUNCTION quick_promote_to_premium(
  target_email TEXT,
  is_early_bird BOOLEAN DEFAULT true,
  billing_period TEXT DEFAULT 'monthly'
)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  price_amount DECIMAL(10,2);
  expire_interval INTERVAL;
BEGIN
  -- Buscar usuario
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;
  
  -- Calcular precio y expiración
  IF billing_period = 'yearly' THEN
    price_amount := CASE WHEN is_early_bird THEN 60.00 ELSE 180.00 END;
    expire_interval := '365 days'::INTERVAL;
  ELSE
    price_amount := CASE WHEN is_early_bird THEN 5.00 ELSE 15.00 END;
    expire_interval := '30 days'::INTERVAL;
  END IF;
  
  -- Actualizar suscripción
  UPDATE user_subscriptions 
  SET 
    subscription_type = 'premium',
    status = 'active',
    is_early_bird = is_early_bird,
    early_bird_price = CASE WHEN is_early_bird THEN price_amount ELSE NULL END,
    price_paid = price_amount,
    billing_period = billing_period,
    started_at = NOW(),
    expires_at = NOW() + expire_interval,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Aplicar límites Premium
  PERFORM set_subscription_limits('premium', target_user_id);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Usuario promovido a Premium exitosamente',
    'user_id', target_user_id,
    'price_paid', price_amount,
    'is_early_bird', is_early_bird
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EJEMPLOS DE USO:

-- Promover a Premium Early Bird mensual (S/ 5)
-- SELECT quick_promote_to_premium('usuario@test.com', true, 'monthly');

-- Promover a Premium Regular mensual (S/ 15)
-- SELECT quick_promote_to_premium('usuario@test.com', false, 'monthly');

-- Promover a Premium Early Bird anual (S/ 60)
-- SELECT quick_promote_to_premium('usuario@test.com', true, 'yearly');