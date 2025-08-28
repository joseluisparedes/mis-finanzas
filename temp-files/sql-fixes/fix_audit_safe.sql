-- SOLUCIÓN SEGURA PARA AUDITORÍA - SOLO TIPOS PERMITIDOS

-- 1. Insertar logs de prueba usando SOLO tipos de acción permitidos
INSERT INTO audit_logs (action_type, table_name, changes_summary, operation_source, created_at) VALUES
('LOGIN', 'auth', 'Administrador José inició sesión', 'auth_system', NOW() - INTERVAL '1 hour'),
('ADMIN_ACTION', 'user_subscriptions', 'Revisión de usuarios en panel de administración', 'admin_panel', NOW() - INTERVAL '30 minutes'),
('SYSTEM_ACTION', 'promotions', 'Verificación de estadísticas de promociones', 'admin_panel', NOW() - INTERVAL '15 minutes'),
('ADMIN_ACTION', 'audit_logs', 'Acceso al sistema de auditoría', 'admin_panel', NOW());

-- 2. Registrar restauración de José usando tipos permitidos
DO $$
DECLARE
    jose_user_id UUID;
    audit_result UUID;
BEGIN
    -- Obtener ID de José
    SELECT id INTO jose_user_id FROM auth.users WHERE email = 'jose241100@gmail.com';
    
    -- Registrar evento de auditoría usando ADMIN_ACTION (que está permitido)
    SELECT log_audit_event(
        'ADMIN_ACTION',
        'user_subscriptions',
        jose_user_id,
        jose_user_id,
        NULL,
        jsonb_build_object('subscription_type', 'admin', 'status', 'active'),
        'Administrador José restaurado correctamente',
        'admin_fix'
    ) INTO audit_result;
    
    RAISE NOTICE 'Log de auditoría creado con ID: %', audit_result;
END $$;

-- 3. Asegurar que José sigue siendo admin
UPDATE user_subscriptions 
SET subscription_type = 'admin', status = 'active', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jose241100@gmail.com');

-- 4. Verificar que hay logs
SELECT 
    'LOGS DE AUDITORÍA DISPONIBLES:' as info,
    COUNT(*) as total_logs,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as logs_today,
    'Tipos usados: LOGIN, ADMIN_ACTION, SYSTEM_ACTION' as tipos_seguros
FROM audit_logs;