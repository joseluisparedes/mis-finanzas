-- ================================================================
-- ACTUALIZAR FUNCIÓN get_all_subscriptions_admin PARA INCLUIR FECHAS
-- ================================================================

-- Primero, asegurar que las columnas existen
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Agregar campo de teléfono si no existe
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Eliminar función existente primero
DROP FUNCTION IF EXISTS get_all_subscriptions_admin();

-- Crear nueva función con las columnas de fechas incluidas
CREATE OR REPLACE FUNCTION get_all_subscriptions_admin()
RETURNS SETOF JSON AS $$
DECLARE
    subscription_record RECORD;
    is_admin BOOLEAN;
BEGIN
    -- Verificar permisos admin
    SELECT is_current_user_admin() INTO is_admin;
    
    IF NOT is_admin THEN
        RETURN QUERY SELECT json_build_object('error', 'No admin permissions')::json;
        RETURN;
    END IF;
    
    -- Devolver cada suscripción como un objeto JSON separado incluyendo fechas
    FOR subscription_record IN 
        SELECT 
            us.id,
            us.user_id,
            us.subscription_type,
            us.status,
            us.started_at,
            us.monthly_transaction_limit,
            us.budget_limit,
            us.multi_currency_enabled,
            us.excel_export_enabled,
            us.is_early_bird,
            us.early_bird_price,
            us.created_at,
            us.updated_at,
            -- NUEVAS COLUMNAS DE FECHAS
            us.subscription_start_date,
            us.subscription_end_date,
            au.email as user_email,
            au.created_at as user_created_at,
            COALESCE(up.display_name, au.email) as display_name,
            up.phone_number
        FROM user_subscriptions us
        LEFT JOIN auth.users au ON us.user_id = au.id
        LEFT JOIN user_profiles up ON us.user_id = up.user_id
        WHERE us.status != 'deleted' OR us.status IS NULL
        ORDER BY us.created_at DESC
    LOOP
        RETURN NEXT json_build_object(
            'id', subscription_record.id,
            'user_id', subscription_record.user_id,
            'subscription_type', subscription_record.subscription_type,
            'status', subscription_record.status,
            'started_at', subscription_record.started_at,
            'monthly_transaction_limit', subscription_record.monthly_transaction_limit,
            'budget_limit', subscription_record.budget_limit,
            'multi_currency_enabled', subscription_record.multi_currency_enabled,
            'excel_export_enabled', subscription_record.excel_export_enabled,
            'is_early_bird', subscription_record.is_early_bird,
            'early_bird_price', subscription_record.early_bird_price,
            'created_at', subscription_record.created_at,
            'updated_at', subscription_record.updated_at,
            -- INCLUIR LAS NUEVAS FECHAS
            'subscription_start_date', subscription_record.subscription_start_date,
            'subscription_end_date', subscription_record.subscription_end_date,
            'user_email', subscription_record.user_email,
            'user_created_at', subscription_record.user_created_at,
            'display_name', subscription_record.display_name,
            'phone_number', subscription_record.phone_number
        );
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar registros existentes con fechas de inicio donde no existan
UPDATE user_subscriptions 
SET subscription_start_date = COALESCE(subscription_start_date, started_at, created_at, NOW())
WHERE subscription_start_date IS NULL;

-- Para usuarios PREMIUM: asegurar fecha fin (30 días desde inicio)
UPDATE user_subscriptions 
SET subscription_end_date = CASE 
    WHEN subscription_end_date IS NULL AND subscription_type = 'premium' THEN 
        COALESCE(subscription_start_date, started_at, created_at, NOW()) + INTERVAL '30 days'
    ELSE subscription_end_date
END
WHERE subscription_type = 'premium';

-- Para usuarios ADMIN: fecha fin muy lejana (100 años)
UPDATE user_subscriptions 
SET subscription_end_date = CASE 
    WHEN subscription_end_date IS NULL AND subscription_type = 'admin' THEN 
        COALESCE(subscription_start_date, started_at, created_at, NOW()) + INTERVAL '100 years'
    ELSE subscription_end_date
END
WHERE subscription_type = 'admin';

-- Para usuarios FREE y FAMILY: sin fecha fin
UPDATE user_subscriptions 
SET subscription_end_date = NULL
WHERE subscription_type IN ('free', 'family');

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_all_subscriptions_admin() TO authenticated;

SELECT 'Función actualizada con columnas de fechas exitosamente!' as resultado;