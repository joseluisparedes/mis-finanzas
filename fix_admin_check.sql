-- FIX PARA EL PROBLEMA DE VERIFICACIÓN DE ADMIN
-- Ejecutar en Supabase SQL Editor

-- 1. Primero restaurar tu admin
UPDATE user_subscriptions SET subscription_type = 'admin', status = 'active', updated_at = NOW() WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);

-- 2. Recrear la función is_current_user_admin para evitar problemas de caché
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_type TEXT;
BEGIN
    -- Consultar directamente con refresh
    SELECT subscription_type 
    FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    INTO user_type;
    
    -- Log para debugging
    RAISE NOTICE 'Usuario actual: %, Tipo: %', auth.uid(), user_type;
    
    RETURN COALESCE(user_type, 'free') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que funciona
SELECT is_current_user_admin() as "soy_admin", auth.uid() as "mi_id";