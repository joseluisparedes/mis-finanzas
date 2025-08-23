-- ==============================================
-- CORREGIR FUNCIÓN promote_user_to_admin
-- ==============================================

-- Función corregida que maneja usuarios sin suscripción
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_email TEXT)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    subscription_exists BOOLEAN;
    result JSON;
BEGIN
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
    
    -- Verificar si ya tiene suscripción
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = target_user_id
    ) INTO subscription_exists;
    
    IF subscription_exists THEN
        -- Actualizar suscripción existente
        UPDATE user_subscriptions 
        SET 
            subscription_type = 'admin',
            status = 'active',
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSE
        -- Crear nueva suscripción
        INSERT INTO user_subscriptions (
            user_id,
            subscription_type,
            status
        ) VALUES (
            target_user_id,
            'admin',
            'active'
        );
    END IF;
    
    -- Aplicar límites de admin (ilimitado)
    PERFORM set_subscription_limits('admin', target_user_id);
    
    RETURN json_build_object(
        'success', true,
        'message', 'Usuario promovido a admin exitosamente',
        'user_id', target_user_id,
        'subscription_created', NOT subscription_exists
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la función corregida para tu usuario
SELECT promote_user_to_admin('jose241100@gmail.com');

-- Verificar que funcionó
SELECT 
  u.email,
  us.subscription_type,
  us.status,
  us.created_at,
  us.updated_at
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'jose241100@gmail.com';

-- Contar usuarios por tipo
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_type = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
FROM user_subscriptions;