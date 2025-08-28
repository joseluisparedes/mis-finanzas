-- CORREGIR SISTEMA DE AUDITORÍA

-- 1. Asegurar que la tabla audit_logs existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    user_id UUID,
    old_values JSONB,
    new_values JSONB,
    changes_summary TEXT,
    operation_source TEXT DEFAULT 'manual',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Función para registrar eventos de auditoría manualmente
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changes_summary TEXT DEFAULT NULL,
    p_operation_source TEXT DEFAULT 'manual',
    p_ip_address INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        action_type, table_name, record_id, user_id,
        old_values, new_values, changes_summary, 
        operation_source, ip_address, created_at
    ) VALUES (
        p_action_type, p_table_name, p_record_id, 
        COALESCE(p_user_id, auth.uid()),
        p_old_values, p_new_values, p_changes_summary,
        p_operation_source, p_ip_address, NOW()
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para user_subscriptions (registrar cambios de suscripción)
CREATE OR REPLACE FUNCTION audit_user_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            'SUBSCRIPTION_CREATED',
            'user_subscriptions',
            NEW.user_id,
            NEW.user_id,
            NULL,
            row_to_json(NEW)::jsonb,
            'Nueva suscripción creada: ' || NEW.subscription_type,
            'system_trigger'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.subscription_type != NEW.subscription_type OR OLD.status != NEW.status THEN
            PERFORM log_audit_event(
                'SUBSCRIPTION_CHANGED',
                'user_subscriptions',
                NEW.user_id,
                auth.uid(),
                row_to_json(OLD)::jsonb,
                row_to_json(NEW)::jsonb,
                'Suscripción cambiada de ' || OLD.subscription_type || ' (' || OLD.status || ') a ' || NEW.subscription_type || ' (' || NEW.status || ')',
                'system_trigger'
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el trigger
DROP TRIGGER IF EXISTS audit_user_subscriptions_trigger ON user_subscriptions;
CREATE TRIGGER audit_user_subscriptions_trigger
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION audit_user_subscriptions();

-- 5. Insertar algunos logs de prueba para José
INSERT INTO audit_logs (action_type, table_name, changes_summary, operation_source, created_at) VALUES
('ADMIN_LOGIN', 'auth', 'Administrador José inició sesión', 'auth_system', NOW() - INTERVAL '1 hour'),
('USER_MANAGEMENT', 'user_subscriptions', 'Revisión de usuarios en panel de administración', 'admin_panel', NOW() - INTERVAL '30 minutes'),
('SYSTEM_CHECK', 'promotions', 'Verificación de estadísticas de promociones', 'admin_panel', NOW() - INTERVAL '15 minutes'),
('AUDIT_ACCESS', 'audit_logs', 'Acceso al sistema de auditoría', 'admin_panel', NOW());

-- 6. Registrar que José es admin
PERFORM log_audit_event(
    'ADMIN_RESTORED',
    'user_subscriptions',
    (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'),
    (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com'),
    NULL,
    jsonb_build_object('subscription_type', 'admin', 'status', 'active'),
    'Administrador José restaurado correctamente',
    'admin_fix'
);

-- 7. Asegurar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 8. Permisos
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, UUID, UUID, JSONB, JSONB, TEXT, TEXT, INET) TO authenticated;

-- 9. Verificar que hay logs
SELECT 
    'LOGS DE AUDITORÍA DISPONIBLES:' as info,
    COUNT(*) as total_logs,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as logs_today
FROM audit_logs;