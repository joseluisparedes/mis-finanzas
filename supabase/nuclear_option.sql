-- OPCIÓN NUCLEAR: Eliminar por nombre específico desde pg_proc
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'change_user_subscription'
    LOOP
        EXECUTE format('DROP FUNCTION %I.%I(%s) CASCADE', func_record.schema_name, func_record.function_name, func_record.args);
        RAISE NOTICE 'Dropped function: %.%(%)', func_record.schema_name, func_record.function_name, func_record.args;
    END LOOP;
END $$;

-- Verificar que no queden funciones
SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'change_user_subscription';

-- Crear la función definitiva
CREATE FUNCTION public.change_user_subscription(
    new_subscription_type TEXT,
    payment_info JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        RETURN json_build_object('success', false, 'error', 'Sin permisos admin');
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
    
    RETURN json_build_object('success', true, 'message', 'Usuario actualizado');
END $$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.change_user_subscription(TEXT, JSONB) TO anon, authenticated;

SELECT 'Función creada exitosamente' as resultado;