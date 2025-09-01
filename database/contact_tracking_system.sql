-- Sistema de seguimiento de contactos por usuario y medio
-- Permite a los administradores rastrear cuántas veces han contactado a cada usuario

-- 1. Crear tabla para el registro de contactos
CREATE TABLE IF NOT EXISTS admin_contact_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Información del contacto
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Detalles del contacto
    contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'whatsapp', 'phone', 'other')),
    contact_reason TEXT,
    contact_notes TEXT,
    
    -- Información adicional
    contact_successful BOOLEAN DEFAULT true,
    response_received BOOLEAN DEFAULT false,
    response_notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_target_user ON admin_contact_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_admin_user ON admin_contact_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_method ON admin_contact_log(contact_method);
CREATE INDEX IF NOT EXISTS idx_admin_contact_log_created_at ON admin_contact_log(created_at);

-- 3. Trigger para updated_at
CREATE TRIGGER update_admin_contact_log_updated_at 
    BEFORE UPDATE ON admin_contact_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS
ALTER TABLE admin_contact_log ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo administradores pueden ver y crear registros de contacto
CREATE POLICY "Admins can view all contact logs" ON admin_contact_log 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND (us.subscription_type = 'admin' OR us.is_admin = true)
        )
    );

CREATE POLICY "Admins can insert contact logs" ON admin_contact_log 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND (us.subscription_type = 'admin' OR us.is_admin = true)
        )
        AND admin_user_id = auth.uid()
    );

CREATE POLICY "Admins can update own contact logs" ON admin_contact_log 
    FOR UPDATE USING (
        admin_user_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.user_id = auth.uid() 
            AND (us.subscription_type = 'admin' OR us.is_admin = true)
        )
    );

-- 5. Función para registrar un contacto
CREATE OR REPLACE FUNCTION log_admin_contact(
    target_user_id UUID,
    contact_method TEXT,
    contact_reason TEXT DEFAULT NULL,
    contact_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    contact_id UUID;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Validar método de contacto
    IF contact_method NOT IN ('email', 'whatsapp', 'phone', 'other') THEN
        RAISE EXCEPTION 'Invalid contact method. Must be: email, whatsapp, phone, other';
    END IF;
    
    -- Insertar registro de contacto
    INSERT INTO admin_contact_log (
        target_user_id,
        admin_user_id,
        contact_method,
        contact_reason,
        contact_notes
    )
    VALUES (
        target_user_id,
        current_user_id,
        contact_method,
        contact_reason,
        contact_notes
    )
    RETURNING id INTO contact_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Contact logged successfully',
        'contact_id', contact_id,
        'contact_method', contact_method
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para obtener estadísticas de contacto por usuario
CREATE OR REPLACE FUNCTION get_user_contact_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    total_contacts INTEGER;
    email_contacts INTEGER;
    whatsapp_contacts INTEGER;
    phone_contacts INTEGER;
    last_contact_date TIMESTAMPTZ;
    last_contact_method TEXT;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (subscription_type = 'admin' OR is_admin = true) FROM user_subscriptions 
    WHERE user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Obtener estadísticas
    SELECT COUNT(*) FROM admin_contact_log 
    WHERE admin_contact_log.target_user_id = target_user_id
    INTO total_contacts;
    
    SELECT COUNT(*) FROM admin_contact_log 
    WHERE admin_contact_log.target_user_id = target_user_id AND contact_method = 'email'
    INTO email_contacts;
    
    SELECT COUNT(*) FROM admin_contact_log 
    WHERE admin_contact_log.target_user_id = target_user_id AND contact_method = 'whatsapp'
    INTO whatsapp_contacts;
    
    SELECT COUNT(*) FROM admin_contact_log 
    WHERE admin_contact_log.target_user_id = target_user_id AND contact_method = 'phone'
    INTO phone_contacts;
    
    -- Obtener último contacto
    SELECT created_at, contact_method
    FROM admin_contact_log
    WHERE admin_contact_log.target_user_id = target_user_id
    ORDER BY created_at DESC
    LIMIT 1
    INTO last_contact_date, last_contact_method;
    
    RETURN json_build_object(
        'user_id', target_user_id,
        'total_contacts', COALESCE(total_contacts, 0),
        'contacts_by_method', json_build_object(
            'email', COALESCE(email_contacts, 0),
            'whatsapp', COALESCE(whatsapp_contacts, 0),
            'phone', COALESCE(phone_contacts, 0),
            'other', COALESCE(total_contacts - email_contacts - whatsapp_contacts - phone_contacts, 0)
        ),
        'last_contact', CASE 
            WHEN last_contact_date IS NOT NULL THEN
                json_build_object(
                    'date', last_contact_date,
                    'method', last_contact_method
                )
            ELSE NULL
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener estadísticas de contacto de todos los usuarios
CREATE OR REPLACE FUNCTION get_all_users_contact_stats()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    display_name TEXT,
    total_contacts BIGINT,
    email_contacts BIGINT,
    whatsapp_contacts BIGINT,
    phone_contacts BIGINT,
    last_contact_date TIMESTAMPTZ,
    last_contact_method TEXT
) AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (us.subscription_type = 'admin' OR us.is_admin = true) FROM user_subscriptions us
    WHERE us.user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Retornar estadísticas de contacto para todos los usuarios
    RETURN QUERY
    WITH contact_stats AS (
        SELECT 
            acl.target_user_id,
            COUNT(*) as total_contacts,
            COUNT(CASE WHEN acl.contact_method = 'email' THEN 1 END) as email_contacts,
            COUNT(CASE WHEN acl.contact_method = 'whatsapp' THEN 1 END) as whatsapp_contacts,
            COUNT(CASE WHEN acl.contact_method = 'phone' THEN 1 END) as phone_contacts
        FROM admin_contact_log acl
        GROUP BY acl.target_user_id
    ),
    last_contacts AS (
        SELECT DISTINCT ON (acl.target_user_id)
            acl.target_user_id,
            acl.created_at as last_contact_date,
            acl.contact_method as last_contact_method
        FROM admin_contact_log acl
        ORDER BY acl.target_user_id, acl.created_at DESC
    )
    SELECT 
        au.id as user_id,
        au.email,
        COALESCE(up.display_name, au.email) as display_name,
        COALESCE(cs.total_contacts, 0) as total_contacts,
        COALESCE(cs.email_contacts, 0) as email_contacts,
        COALESCE(cs.whatsapp_contacts, 0) as whatsapp_contacts,
        COALESCE(cs.phone_contacts, 0) as phone_contacts,
        lc.last_contact_date,
        lc.last_contact_method
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.user_id
    LEFT JOIN contact_stats cs ON au.id = cs.target_user_id
    LEFT JOIN last_contacts lc ON au.id = lc.target_user_id
    WHERE au.deleted_at IS NULL
    ORDER BY COALESCE(cs.total_contacts, 0) DESC, au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para obtener historial completo de contactos
CREATE OR REPLACE FUNCTION get_contact_history(
    target_user_id UUID DEFAULT NULL,
    limit_records INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    target_user_email TEXT,
    admin_user_email TEXT,
    contact_method TEXT,
    contact_reason TEXT,
    contact_notes TEXT,
    contact_successful BOOLEAN,
    response_received BOOLEAN,
    response_notes TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Verificar autenticación
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Verificar si es admin
    SELECT (us.subscription_type = 'admin' OR us.is_admin = true) FROM user_subscriptions us
    WHERE us.user_id = current_user_id 
    INTO is_admin;
    
    IF NOT COALESCE(is_admin, false) THEN
        RAISE EXCEPTION 'Access denied: Admin permissions required';
    END IF;
    
    -- Retornar historial de contactos
    RETURN QUERY
    SELECT 
        acl.id,
        target_user.email as target_user_email,
        admin_user.email as admin_user_email,
        acl.contact_method,
        acl.contact_reason,
        acl.contact_notes,
        acl.contact_successful,
        acl.response_received,
        acl.response_notes,
        acl.created_at
    FROM admin_contact_log acl
    LEFT JOIN auth.users target_user ON acl.target_user_id = target_user.id
    LEFT JOIN auth.users admin_user ON acl.admin_user_id = admin_user.id
    WHERE (target_user_id IS NULL OR acl.target_user_id = target_user_id)
    ORDER BY acl.created_at DESC
    LIMIT limit_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Permisos para las funciones
GRANT EXECUTE ON FUNCTION log_admin_contact(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_contact_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_contact_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_contact_history(UUID, INTEGER) TO authenticated;

-- 10. Comentarios
COMMENT ON TABLE admin_contact_log IS 'Registro de contactos de administradores hacia usuarios';
COMMENT ON FUNCTION log_admin_contact IS 'Registra un contacto realizado por un administrador';
COMMENT ON FUNCTION get_user_contact_stats IS 'Obtiene estadísticas de contacto para un usuario específico';
COMMENT ON FUNCTION get_all_users_contact_stats IS 'Obtiene estadísticas de contacto para todos los usuarios';
COMMENT ON FUNCTION get_contact_history IS 'Obtiene el historial completo de contactos';

-- 11. Mensaje de confirmación
SELECT 'Contact tracking system created successfully!' as result;
SELECT 'Admins can now track contacts via log_admin_contact() and view stats' as functionality;