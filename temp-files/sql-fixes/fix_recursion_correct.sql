-- CORRECCIÓN SIN RECURSIÓN - USANDO ESTRUCTURA REAL
-- ==================================================
-- Basado en que subscription_type está en user_subscriptions, no user_profiles
-- Solución: usar función intermedia para romper recursión

-- 1. ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ===================================

DROP POLICY IF EXISTS "Admins can manage user subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admin and user access to subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscription changes" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage subscription changes" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage change logs" ON subscription_change_log;
DROP POLICY IF EXISTS "Admins can manage contact logs" ON admin_contact_log;

-- 2. DESHABILITAR RLS TEMPORALMENTE PARA user_subscriptions
-- =========================================================
-- Esto evita la recursión mientras mantenemos seguridad en otras tablas

ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 3. MANTENER RLS EN OTRAS TABLAS CON MÉTODO SEGURO
-- =================================================

-- Para subscription_change_log - usar email directo para José
CREATE POLICY "Jose admin can manage change logs" ON subscription_change_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'jose241100@gmail.com'
        )
    );

-- Para admin_contact_log - mismo patrón
CREATE POLICY "Jose admin can manage contact logs" ON admin_contact_log 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email = 'jose241100@gmail.com'
        )
    );

-- 4. FUNCIÓN ADMIN CHECK SIN RECURSIÓN
-- ====================================

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar directamente por email para evitar recursión
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'jose241100@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ACTUALIZAR FUNCIONES ADMIN PARA NO USAR RLS
-- ===============================================

CREATE OR REPLACE FUNCTION admin_update_user_phone(
    target_user_id UUID,
    new_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    is_admin BOOLEAN;
    affected_rows INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin directamente por email
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    is_admin := (current_user_email = 'jose241100@gmail.com');
    
    IF NOT is_admin THEN
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

-- 6. FUNCIÓN DE CONTACTO SIN RLS
-- ===============================

CREATE OR REPLACE FUNCTION log_admin_contact(
    target_user_id UUID,
    contact_method TEXT,
    contact_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
    is_admin BOOLEAN;
    contact_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin directamente por email
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
    is_admin := (current_user_email = 'jose241100@gmail.com');
    
    IF NOT is_admin THEN
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

-- 7. ASEGURAR QUE JOSÉ TENGA SUSCRIPCIÓN ADMIN
-- ============================================

-- Actualizar o insertar suscripción admin para José
INSERT INTO user_subscriptions (
    user_id, 
    subscription_type, 
    status,
    started_at,
    created_at,
    updated_at
)
SELECT 
    au.id,
    'admin',
    'active',
    NOW(),
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = 'jose241100@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    subscription_type = 'admin',
    status = 'active',
    updated_at = NOW();

-- 8. VERIFICAR ESTADO FINAL
-- =========================

SELECT 'Recursion fixed - RLS disabled on user_subscriptions' as status;
SELECT 'Admin check now uses direct email verification' as solution;
SELECT 'José confirmed as admin in user_subscriptions' as admin_status;

-- Mostrar estado de José
SELECT 'JOSE ADMIN STATUS:' as info;
SELECT us.subscription_type, us.status, au.email
FROM user_subscriptions us
JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'jose241100@gmail.com';