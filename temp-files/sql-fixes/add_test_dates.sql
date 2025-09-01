-- Agregar fechas de vencimiento de prueba para demostrar las alertas

-- Actualizar algunos usuarios con fechas de vencimiento para testing
-- (Solo si no tienen fechas ya)

-- Usuario que vence en 1 día (para ver alerta crítica)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '29 days',
    subscription_end_date = NOW() + INTERVAL '1 day'
WHERE subscription_type = 'premium' 
AND subscription_end_date IS NULL
LIMIT 1;

-- Usuario que vence en 3 días (para ver alerta de advertencia)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '27 days',
    subscription_end_date = NOW() + INTERVAL '3 days'
WHERE subscription_type = 'premium' 
AND subscription_end_date IS NULL
AND id != (
    SELECT id FROM user_subscriptions 
    WHERE subscription_end_date = NOW() + INTERVAL '1 day'
    LIMIT 1
)
LIMIT 1;

-- Usuario que ya venció (para ver alerta de vencido)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '35 days',
    subscription_end_date = NOW() - INTERVAL '2 days'
WHERE subscription_type = 'premium' 
AND subscription_end_date IS NULL
AND id NOT IN (
    SELECT id FROM user_subscriptions 
    WHERE subscription_end_date IN (NOW() + INTERVAL '1 day', NOW() + INTERVAL '3 days')
)
LIMIT 1;

-- Asegurar que los planes Free y Family no tengan fecha de finalización
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, created_at, NOW()),
    subscription_end_date = NULL
WHERE subscription_type IN ('free', 'family');

-- Agregar fechas de inicio para todos los usuarios que no las tengan
UPDATE user_subscriptions 
SET subscription_start_date = COALESCE(started_at, created_at, NOW())
WHERE subscription_start_date IS NULL;

SELECT 'Test dates added successfully!' as result;
SELECT 'Check AdminPanel to see expiration alerts' as next_step;