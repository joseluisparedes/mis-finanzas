-- ==============================================
-- USUARIOS DE PRUEBA PARA CADA ROL
-- EJECUTAR EN SUPABASE SQL EDITOR DESPUÉS DE CONFIGURAR ADMIN
-- ==============================================

-- NOTA: Estos usuarios se crean con emails ficticios para pruebas
-- En producción, usa emails reales para testing

-- ==============================================
-- CREAR USUARIOS DE PRUEBA MANUALMENTE
-- ==============================================

-- Para crear usuarios de prueba reales, debes:
-- 1. Ir a Authentication -> Users en Supabase Dashboard
-- 2. Hacer clic en "Invite user" o "Add user"
-- 3. Crear usuarios con estos emails:
--    - free-user@test.com (será FREE por defecto)
--    - premium-user@test.com (lo promocionaremos a PREMIUM)

-- ==============================================
-- SCRIPTS PARA PROMOCIONAR USUARIOS EXISTENTES
-- ==============================================

-- Una vez que hayas creado los usuarios en el panel de Supabase:

-- 1. Promover usuario a PREMIUM (reemplaza el email)
UPDATE user_subscriptions 
SET 
  subscription_type = 'premium',
  status = 'active',
  is_early_bird = true,
  early_bird_price = 5.00,
  price_paid = 5.00,
  billing_period = 'monthly',
  started_at = NOW(),
  expires_at = NOW() + INTERVAL '30 days'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'premium-user@test.com'
);

-- Aplicar límites Premium al usuario
SELECT set_subscription_limits(
  'premium', 
  (SELECT id FROM auth.users WHERE email = 'premium-user@test.com')
);

-- ==============================================
-- VERIFICAR USUARIOS CREADOS
-- ==============================================

-- Ver todos los usuarios y sus roles
SELECT 
  u.email,
  u.created_at as user_created,
  us.subscription_type,
  us.status,
  us.is_early_bird,
  us.early_bird_price,
  us.monthly_transaction_limit,
  us.budget_limit,
  us.multi_currency_enabled,
  us.excel_export_enabled
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
ORDER BY u.created_at DESC;

-- ==============================================
-- SIMULAR DATOS DE PRUEBA
-- ==============================================

-- Para el usuario FREE: Crear datos que se acerquen a los límites
-- (Ejecutar después de registrar free-user@test.com)

-- Simular 28 transacciones para usuario FREE (cerca del límite de 30)
/*
DO $$
DECLARE
  free_user_id UUID;
BEGIN
  SELECT id INTO free_user_id FROM auth.users WHERE email = 'free-user@test.com';
  
  IF free_user_id IS NOT NULL THEN
    -- Crear gastos de prueba
    FOR i IN 1..20 LOOP
      INSERT INTO expenses (user_id, amount, description, date, category_id)
      VALUES (
        free_user_id, 
        (random() * 100 + 10)::DECIMAL(15,2), 
        'Gasto de prueba ' || i,
        CURRENT_DATE - (i || ' days')::INTERVAL,
        (SELECT id FROM categories WHERE user_id = free_user_id LIMIT 1)
      );
    END LOOP;
    
    -- Crear ingresos de prueba  
    FOR i IN 1..8 LOOP
      INSERT INTO incomes (user_id, amount, description, date, income_type_id)
      VALUES (
        free_user_id,
        (random() * 500 + 100)::DECIMAL(15,2),
        'Ingreso de prueba ' || i,
        CURRENT_DATE - (i || ' days')::INTERVAL,
        (SELECT id FROM income_types WHERE user_id = free_user_id LIMIT 1)
      );
    END LOOP;
    
    RAISE NOTICE 'Datos de prueba creados para usuario FREE';
  END IF;
END $$;
*/

-- ==============================================
-- COMANDOS ÚTILES PARA TESTING
-- ==============================================

-- Reset usuario a FREE
/*
UPDATE user_subscriptions 
SET subscription_type = 'free', status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL@gmail.com');

SELECT set_subscription_limits('free', (SELECT id FROM auth.users WHERE email = 'TU_EMAIL@gmail.com'));
*/

-- Ver información completa de suscripción de un usuario
/*
SELECT get_user_subscription_info(
  (SELECT id FROM auth.users WHERE email = 'TU_EMAIL@gmail.com')
);
*/