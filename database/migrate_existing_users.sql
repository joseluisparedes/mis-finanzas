-- ==============================================
-- MIGRAR USUARIOS EXISTENTES A SISTEMA DE SUSCRIPCIONES
-- ==============================================

-- Función para crear suscripciones FREE para usuarios existentes sin suscripción
CREATE OR REPLACE FUNCTION migrate_existing_users_to_subscriptions()
RETURNS JSON AS $$
DECLARE
    users_migrated INTEGER := 0;
    user_record RECORD;
    result JSON;
BEGIN
    -- Crear suscripciones FREE para usuarios sin suscripción
    FOR user_record IN 
        SELECT u.id, u.email, u.created_at
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = u.id
        )
    LOOP
        -- Crear suscripción FREE por defecto
        INSERT INTO user_subscriptions (
            user_id,
            subscription_type,
            status,
            started_at
        ) VALUES (
            user_record.id,
            'free',
            'active',
            user_record.created_at
        );
        
        -- Aplicar límites FREE
        PERFORM set_subscription_limits('free', user_record.id);
        
        users_migrated := users_migrated + 1;
        
        RAISE NOTICE 'Usuario migrado: % (ID: %)', user_record.email, user_record.id;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuarios migrados exitosamente',
        'users_migrated', users_migrated
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar migración de usuarios existentes
SELECT migrate_existing_users_to_subscriptions();

-- Ahora promover tu usuario específicamente a admin
SELECT promote_user_to_admin('jose241100@gmail.com');

-- Verificar estado final de todos los usuarios
SELECT 
  u.email,
  us.subscription_type,
  us.status,
  us.monthly_transaction_limit,
  us.created_at as subscription_created,
  u.created_at as user_created
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
ORDER BY u.created_at DESC;

-- Estadísticas finales
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE us.user_id IS NULL) as users_without_subscription
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id;

-- Verificar límites del admin
SELECT 
  u.email,
  us.subscription_type,
  us.monthly_transaction_limit,
  us.budget_limit,
  us.multi_currency_enabled,
  us.excel_export_enabled,
  us.advanced_reports_enabled
FROM auth.users u
JOIN user_subscriptions us ON u.id = us.user_id
WHERE us.subscription_type = 'admin';