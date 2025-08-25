-- Forzar eliminación de TODAS las funciones con este nombre
DROP FUNCTION IF EXISTS change_user_subscription CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text, text) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text, text, json) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS change_user_subscription(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text, text, json) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_subscription(jsonb) CASCADE;

-- Ver si quedan funciones
SELECT routine_name, routine_schema, specific_name
FROM information_schema.routines 
WHERE routine_name = 'change_user_subscription';

-- Crear la función ÚNICA y simple
CREATE FUNCTION public.change_user_subscription(
    new_subscription_type TEXT,
    payment_info JSONB
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    is_admin BOOLEAN;
    user_email TEXT;
BEGIN
    user_email := payment_info->>'target_user_email';
    
    IF user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Email requerido');
    END IF;
    
    SELECT is_current_user_admin() INTO is_admin;
    IF NOT is_admin THEN
        RETURN json_build_object('success', false, 'error', 'No admin permissions');
    END IF;
    
    SELECT id FROM auth.users WHERE email = user_email INTO target_user_id;
    IF target_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;
    
    INSERT INTO user_subscriptions (user_id, subscription_type, status)
    VALUES (target_user_id, new_subscription_type, 'active')
    ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = new_subscription_type,
        status = 'active',
        updated_at = NOW();
    
    RETURN json_build_object('success', true, 'message', 'Cambio exitoso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.change_user_subscription(TEXT, JSONB) TO anon, authenticated;