-- CORRECCIÓN DE RECURSIÓN INFINITA EN RLS
-- =========================================
-- El problema: políticas RLS que consultan la misma tabla crean bucle infinito
-- Solución: usar user_profiles para admin check, no user_subscriptions

-- 1. ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ===================================

-- Eliminar todas las políticas recursivas
DROP POLICY IF EXISTS "Admins can manage user subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscription changes" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage subscription changes" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage contact logs" ON admin_contact_log;

-- 2. RECREAR POLÍTICAS SIN RECURSIÓN
-- ===================================

-- user_subscriptions: usar user_profiles para admin check
CREATE POLICY "Admin and user access to subscriptions" ON user_subscriptions 
    FOR ALL USING (
        -- El usuario puede ver/editar su propia suscripción
        user_id = auth.uid()
        OR
        -- O es admin (usando user_profiles, no user_subscriptions)
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.subscription_type = 'admin'
        )
    );

-- subscription_change_log: mismo patrón
CREATE POLICY "Admins can manage change logs" ON subscription_change_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.subscription_type = 'admin'
        )
    );

-- admin_contact_log: mismo patrón
CREATE POLICY "Admins can manage contact logs" ON admin_contact_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.user_id = auth.uid() 
            AND up.subscription_type = 'admin'
        )
    );

-- 3. ACTUALIZAR FUNCIONES PARA USAR user_profiles
-- ================================================

-- Función admin check sin recursión
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND subscription_type = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar funciones admin para usar user_profiles
CREATE OR REPLACE FUNCTION admin_update_user_phone(
    target_user_id UUID,
    new_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    affected_rows INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin usando user_profiles
    SELECT (subscription_type = 'admin') FROM user_profiles 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Actualizar o insertar perfil con número de teléfono
    INSERT INTO user_profiles (user_id, display_name, phone_number)
    VALUES (
        target_user_id, 
        COALESCE((SELECT email FROM auth.users WHERE id = target_user_id), ''),
        TRIM(new_phone_number)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        phone_number = TRIM(EXCLUDED.phone_number),
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Phone number updated for user %s', target_user_id),
        'new_phone_number', TRIM(new_phone_number)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función de contacto
CREATE OR REPLACE FUNCTION log_admin_contact(
    target_user_id UUID,
    contact_method TEXT,
    contact_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    contact_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin usando user_profiles
    SELECT (subscription_type = 'admin') FROM user_profiles 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    INSERT INTO admin_contact_log (
        target_user_id, admin_user_id, contact_method, contact_reason
    )
    VALUES (
        target_user_id, current_user_id, contact_method, contact_reason
    )
    RETURNING id INTO contact_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contact logged successfully',
        'contact_id', contact_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VERIFICAR QUE JOSÉ ESTÁ EN user_profiles COMO ADMIN
-- ======================================================

-- Insertar o actualizar José como admin en user_profiles
INSERT INTO user_profiles (user_id, display_name, subscription_type, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.email, 'José Luis'),
    'admin',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'jose241100@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    subscription_type = 'admin',
    updated_at = NOW();

-- 5. MENSAJES DE CONFIRMACIÓN
-- ===========================

SELECT 'Recursion fixed successfully!' as status;
SELECT 'Admin check now uses user_profiles, not user_subscriptions' as solution;
SELECT 'José updated in user_profiles as admin' as admin_status;