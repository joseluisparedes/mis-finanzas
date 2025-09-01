-- Agregar fechas de vencimiento de prueba para demostrar las alertas
-- Script corregido sin errores de sintaxis

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

-- Usuario que vence en 1 día (para ver alerta crítica)
WITH premium_users AS (
    SELECT id 
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' 
    AND subscription_end_date IS NULL
    ORDER BY created_at
    LIMIT 1
)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '29 days',
    subscription_end_date = NOW() + INTERVAL '1 day'
WHERE id IN (SELECT id FROM premium_users);

-- Usuario que vence en 3 días (para ver alerta de advertencia)
WITH premium_users AS (
    SELECT id 
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' 
    AND subscription_end_date IS NULL
    ORDER BY created_at
    LIMIT 1
)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '27 days',
    subscription_end_date = NOW() + INTERVAL '3 days'
WHERE id IN (SELECT id FROM premium_users);

-- Usuario que ya venció (para ver alerta de vencido)
WITH premium_users AS (
    SELECT id 
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' 
    AND subscription_end_date IS NULL
    ORDER BY created_at
    LIMIT 1
)
UPDATE user_subscriptions 
SET 
    subscription_start_date = NOW() - INTERVAL '35 days',
    subscription_end_date = NOW() - INTERVAL '2 days'
WHERE id IN (SELECT id FROM premium_users);

-- Si no hay usuarios premium, crear fechas de ejemplo para cualquier usuario (excepto admin)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Contar cuántos usuarios premium tienen fechas ya
    SELECT COUNT(*) INTO user_count 
    FROM user_subscriptions 
    WHERE subscription_type = 'premium' AND subscription_end_date IS NOT NULL;
    
    -- Si no hay usuarios premium con fechas, usar cualquier usuario no-admin
    IF user_count = 0 THEN
        -- Promover algunos usuarios free a premium con fechas de prueba
        WITH free_users AS (
            SELECT id 
            FROM user_subscriptions 
            WHERE subscription_type = 'free'
            AND user_id != (SELECT id FROM auth.users WHERE email LIKE '%admin%' OR email = 'jose241100@gmail.com' LIMIT 1)
            ORDER BY created_at
            LIMIT 3
        )
        UPDATE user_subscriptions 
        SET 
            subscription_type = 'premium',
            subscription_start_date = CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 1 THEN NOW() - INTERVAL '29 days'
                WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 2 THEN NOW() - INTERVAL '27 days'
                ELSE NOW() - INTERVAL '35 days'
            END,
            subscription_end_date = CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 1 THEN NOW() + INTERVAL '1 day'
                WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 2 THEN NOW() + INTERVAL '3 days'
                ELSE NOW() - INTERVAL '2 days'
            END
        WHERE id IN (SELECT id FROM free_users);
    END IF;
END $$;

-- Agregar algunas fechas normales (sin alertas) para otros usuarios premium
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, NOW() - INTERVAL '10 days'),
    subscription_end_date = NOW() + INTERVAL '20 days'
WHERE subscription_type = 'premium' 
AND subscription_end_date IS NULL;

SELECT 'Test dates added successfully!' as result;
SELECT 'Premium users now have expiration dates for testing alerts' as info;
SELECT 'Check AdminPanel to see expiration alerts in different colors' as next_step;

-- Mostrar resumen de lo que se creó
SELECT 
    subscription_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_end_date IS NOT NULL THEN 1 END) as users_with_end_date,
    COUNT(CASE WHEN subscription_end_date < NOW() THEN 1 END) as expired_users,
    COUNT(CASE WHEN subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days' THEN 1 END) as expiring_soon
FROM user_subscriptions 
WHERE subscription_type IN ('premium', 'free', 'family')
GROUP BY subscription_type
ORDER BY subscription_type;