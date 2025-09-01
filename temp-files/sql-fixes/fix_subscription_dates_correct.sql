-- Script para configurar correctamente las 3 fechas de suscripción
-- ================================================================

-- CONCEPTOS CLAROS:
-- 1. created_at = Fecha de registro (creación de la cuenta) - YA EXISTE
-- 2. subscription_start_date = Fecha de inicio del PLAN ACTUAL (última vez que se le asignó este plan)
-- 3. subscription_end_date = Fecha fin del plan (inicio + duración del plan)
--    - SOLO Free y Family NO tienen fecha fin
--    - TODOS los demás planes SÍ deben tener fecha fin

-- ================================================================
-- 1. ASEGURAR QUE EXISTEN LAS COLUMNAS
-- ================================================================

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- ================================================================
-- 2. CONFIGURAR FECHAS CORRECTAMENTE
-- ================================================================

-- Para usuarios FREE: Solo fecha de inicio, NO fecha fin
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, started_at, created_at, NOW()),
    subscription_end_date = NULL
WHERE subscription_type = 'free';

-- Para usuarios FAMILY: Solo fecha de inicio, NO fecha fin  
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, started_at, created_at, NOW()),
    subscription_end_date = NULL
WHERE subscription_type = 'family';

-- Para usuarios PREMIUM: Fecha inicio Y fecha fin (mensual = +30 días)
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, started_at, created_at, NOW()),
    subscription_end_date = CASE 
        WHEN subscription_end_date IS NULL THEN 
            COALESCE(subscription_start_date, started_at, created_at, NOW()) + INTERVAL '30 days'
        ELSE subscription_end_date
    END
WHERE subscription_type = 'premium';

-- Para usuarios ADMIN: Fecha inicio Y fecha fin (NO VENCEN - 100 años)
UPDATE user_subscriptions 
SET 
    subscription_start_date = COALESCE(subscription_start_date, started_at, created_at, NOW()),
    subscription_end_date = CASE 
        WHEN subscription_end_date IS NULL THEN 
            COALESCE(subscription_start_date, started_at, created_at, NOW()) + INTERVAL '100 years'
        ELSE subscription_end_date
    END
WHERE subscription_type = 'admin';

-- ================================================================
-- 3. CREAR USUARIOS DE PRUEBA CON DIFERENTES ESCENARIOS
-- ================================================================

-- Crear escenarios de prueba para ver alertas
DO $$
DECLARE
    premium_user_ids UUID[];
    i INTEGER := 1;
BEGIN
    -- Obtener algunos usuarios premium para testing
    SELECT ARRAY(
        SELECT user_id 
        FROM user_subscriptions 
        WHERE subscription_type = 'premium' 
        LIMIT 4
    ) INTO premium_user_ids;
    
    -- Si tenemos usuarios premium, crear escenarios
    IF array_length(premium_user_ids, 1) > 0 THEN
        -- Escenario 1: Usuario que vence HOY
        IF premium_user_ids[1] IS NOT NULL THEN
            UPDATE user_subscriptions 
            SET 
                subscription_start_date = NOW() - INTERVAL '30 days',
                subscription_end_date = NOW()
            WHERE user_id = premium_user_ids[1];
        END IF;
        
        -- Escenario 2: Usuario que vence en 2 días  
        IF premium_user_ids[2] IS NOT NULL THEN
            UPDATE user_subscriptions 
            SET 
                subscription_start_date = NOW() - INTERVAL '28 days',
                subscription_end_date = NOW() + INTERVAL '2 days'
            WHERE user_id = premium_user_ids[2];
        END IF;
        
        -- Escenario 3: Usuario que YA VENCIÓ (hace 3 días)
        IF premium_user_ids[3] IS NOT NULL THEN
            UPDATE user_subscriptions 
            SET 
                subscription_start_date = NOW() - INTERVAL '33 days',
                subscription_end_date = NOW() - INTERVAL '3 days'
            WHERE user_id = premium_user_ids[3];
        END IF;
        
        -- Escenario 4: Usuario normal (vence en 15 días)
        IF premium_user_ids[4] IS NOT NULL THEN
            UPDATE user_subscriptions 
            SET 
                subscription_start_date = NOW() - INTERVAL '15 days',
                subscription_end_date = NOW() + INTERVAL '15 days'
            WHERE user_id = premium_user_ids[4];
        END IF;
    END IF;
END $$;

-- ================================================================
-- 4. FUNCIONES PARA MANEJAR PROMOCIONES CON FECHAS CORRECTAS
-- ================================================================

-- Función para promover usuario y establecer fechas correctas
CREATE OR REPLACE FUNCTION promote_user_with_dates(
    target_user_id UUID,
    new_subscription_type TEXT,
    billing_period TEXT DEFAULT 'monthly'
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin') FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Calcular fecha de finalización según el plan
    CASE 
        WHEN new_subscription_type IN ('free', 'family') THEN
            new_end_date := NULL; -- Sin vencimiento
        WHEN new_subscription_type = 'admin' THEN
            new_end_date := NOW() + INTERVAL '100 years'; -- Prácticamente sin vencimiento
        WHEN billing_period = 'annual' THEN
            new_end_date := NOW() + INTERVAL '1 year';
        ELSE
            new_end_date := NOW() + INTERVAL '30 days'; -- Mensual por defecto
    END CASE;
    
    -- Actualizar suscripción con fechas correctas
    UPDATE user_subscriptions 
    SET 
        subscription_type = new_subscription_type,
        subscription_start_date = NOW(), -- Fecha de inicio del NUEVO plan
        subscription_end_date = new_end_date,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', format('User promoted to %s', new_subscription_type),
        'new_start_date', NOW(),
        'new_end_date', new_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. VERIFICACIÓN Y RESUMEN
-- ================================================================

-- Mostrar resumen de configuración actual
SELECT 
    'RESUMEN DE CONFIGURACIÓN DE FECHAS' as info;

SELECT 
    subscription_type,
    COUNT(*) as total_usuarios,
    COUNT(subscription_start_date) as con_fecha_inicio,
    COUNT(subscription_end_date) as con_fecha_fin,
    COUNT(CASE WHEN subscription_end_date < NOW() THEN 1 END) as vencidos,
    COUNT(CASE WHEN subscription_end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days' THEN 1 END) as vencen_pronto
FROM user_subscriptions 
GROUP BY subscription_type
ORDER BY subscription_type;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION promote_user_with_dates(UUID, TEXT, TEXT) TO authenticated;

SELECT 'Configuración de fechas completada correctamente!' as resultado;
SELECT 'Free y Family: Sin fecha fin | Premium/Admin: Con fecha fin' as reglas;