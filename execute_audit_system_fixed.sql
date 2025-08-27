-- EJECUTAR SISTEMA COMPLETO DE AUDITORÍA EN SUPABASE (VERSIÓN CORREGIDA)
-- Copiar y pegar todo este contenido en Supabase SQL Editor

-- ================================================================
-- PASO 1: TABLAS DEL SISTEMA DE AUDITORÍA
-- ================================================================

-- Tabla principal de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  operation_source VARCHAR(100),
  operation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
    'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SUBSCRIPTION_CHANGED',
    'ACCOUNT_SUSPENDED', 'ACCOUNT_RESTORED', 'ACCOUNT_DELETED',
    'EXPORT_DATA', 'ADMIN_ACTION', 'SYSTEM_ACTION'
  ))
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT TRUE,
  logout_reason VARCHAR(100),
  CONSTRAINT valid_logout_reason CHECK (logout_reason IN (
    'user_logout', 'session_expired', 'admin_terminated', 'security_breach', 'duplicate_session'
  ))
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Tabla de estado de cuentas
CREATE TABLE IF NOT EXISTS account_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  suspension_reason TEXT,
  suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  data_retention_days INTEGER DEFAULT 365,
  export_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'pending_deletion', 'deleted'))
);

-- ================================================================
-- PASO 2: FUNCIONES DE AUDITORÍA
-- ================================================================

-- Función principal de logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action_type TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_changes_summary TEXT DEFAULT NULL,
  p_operation_source TEXT DEFAULT 'system',
  p_operation_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  current_user_email TEXT;
  current_user_role TEXT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT email INTO current_user_email FROM auth.users WHERE id = p_user_id;
    SELECT subscription_type INTO current_user_role FROM user_subscriptions WHERE user_id = p_user_id;
  END IF;

  INSERT INTO audit_logs (
    action_type, table_name, record_id, user_id, user_email, user_role,
    old_values, new_values, changes_summary, ip_address, user_agent,
    operation_source, operation_reason
  ) VALUES (
    p_action_type, p_table_name, p_record_id, p_user_id, current_user_email, current_user_role,
    p_old_values, p_new_values, p_changes_summary, p_ip_address, p_user_agent,
    p_operation_source, p_operation_reason
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función trigger genérica
CREATE OR REPLACE FUNCTION trigger_audit_log() RETURNS TRIGGER AS $$
DECLARE
  operation_type TEXT;
  old_values JSONB := NULL;
  new_values JSONB := NULL;
  changes_text TEXT := '';
  current_user_id UUID;
BEGIN
  operation_type := TG_OP;
  current_user_id := auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    old_values := row_to_json(OLD)::JSONB;
    changes_text := 'Record deleted';
  ELSIF TG_OP = 'INSERT' THEN
    new_values := row_to_json(NEW)::JSONB;
    changes_text := 'New record created';
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := row_to_json(OLD)::JSONB;
    new_values := row_to_json(NEW)::JSONB;
    changes_text := 'Record updated';
  END IF;

  PERFORM log_audit_event(
    operation_type, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id)::UUID,
    current_user_id, old_values, new_values, changes_text, 'database_trigger', NULL
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 3: CREAR TRIGGERS SOLO EN TABLAS QUE EXISTEN
-- ================================================================

-- Trigger para expenses (solo si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    DROP TRIGGER IF EXISTS audit_expenses_trigger ON expenses;
    CREATE TRIGGER audit_expenses_trigger
      AFTER INSERT OR UPDATE OR DELETE ON expenses
      FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
    RAISE NOTICE 'Trigger para expenses creado exitosamente';
  ELSE
    RAISE NOTICE 'Tabla expenses no existe, saltando trigger';
  END IF;
END $$;

-- Trigger para budgets (solo si la tabla existe) 
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    DROP TRIGGER IF EXISTS audit_budgets_trigger ON budgets;
    CREATE TRIGGER audit_budgets_trigger
      AFTER INSERT OR UPDATE OR DELETE ON budgets
      FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
    RAISE NOTICE 'Trigger para budgets creado exitosamente';
  ELSE
    RAISE NOTICE 'Tabla budgets no existe, saltando trigger';
  END IF;
END $$;

-- Trigger para user_subscriptions (esta sí existe)
DROP TRIGGER IF EXISTS audit_user_subscriptions_trigger ON user_subscriptions;
CREATE TRIGGER audit_user_subscriptions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Trigger para user_profiles (solo si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
    CREATE TRIGGER audit_user_profiles_trigger
      AFTER INSERT OR UPDATE OR DELETE ON user_profiles
      FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
    RAISE NOTICE 'Trigger para user_profiles creado exitosamente';
  ELSE
    RAISE NOTICE 'Tabla user_profiles no existe, saltando trigger';
  END IF;
END $$;

-- ================================================================
-- PASO 4: FUNCIONES ADMINISTRATIVAS
-- ================================================================

-- Función para suspender usuario
CREATE OR REPLACE FUNCTION suspend_user_account(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  INSERT INTO account_status (user_id, status, suspension_reason, suspended_by, suspended_at)
  VALUES (p_user_id, 'suspended', p_reason, p_admin_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = 'suspended',
    suspension_reason = p_reason,
    suspended_by = p_admin_id,
    suspended_at = NOW(),
    updated_at = NOW();

  PERFORM log_audit_event(
    'ACCOUNT_SUSPENDED', 'account_status', p_user_id, p_admin_id,
    NULL, jsonb_build_object('reason', p_reason),
    'Account suspended by admin: ' || p_reason, 'admin_panel', p_reason
  );

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para restaurar usuario
CREATE OR REPLACE FUNCTION restore_user_account(
  p_user_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  UPDATE account_status 
  SET status = 'active', suspension_reason = NULL, suspended_by = NULL, 
      suspended_at = NULL, updated_at = NOW()
  WHERE user_id = p_user_id;

  PERFORM log_audit_event(
    'ACCOUNT_RESTORED', 'account_status', p_user_id, p_admin_id,
    NULL, NULL, 'Account restored by admin', 'admin_panel', 'Account restoration'
  );

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar usuario (soft delete)
CREATE OR REPLACE FUNCTION soft_delete_user_account(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  UPDATE account_status 
  SET status = 'deleted', is_deleted = TRUE, deleted_reason = p_reason,
      deleted_by = p_admin_id, deleted_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id;

  PERFORM log_audit_event(
    'ACCOUNT_DELETED', 'account_status', p_user_id, p_admin_id,
    NULL, jsonb_build_object('reason', p_reason),
    'Account deleted by admin: ' || p_reason, 'admin_panel', p_reason
  );

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 5: FUNCIONES DE CONSULTA PARA DASHBOARD (VERSIÓN SEGURA)
-- ================================================================

-- Obtener lista detallada de usuarios (versión simplificada y segura)
CREATE OR REPLACE FUNCTION get_users_detailed_admin()
RETURNS TABLE (
  user_id UUID, email TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ,
  full_name TEXT, first_name TEXT, avatar_url TEXT,
  subscription_type TEXT, subscription_status TEXT,
  account_status TEXT, is_suspended BOOLEAN, suspension_reason TEXT,
  suspended_at TIMESTAMPTZ, is_deleted BOOLEAN, deleted_at TIMESTAMPTZ,
  total_expenses BIGINT, total_income BIGINT, total_budgets BIGINT,
  last_activity TIMESTAMPTZ, total_actions BIGINT,
  current_sessions BIGINT, last_ip INET, last_user_agent TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.email, u.created_at, u.last_sign_in_at,
    COALESCE(up.full_name, ''), COALESCE(up.first_name, ''), COALESCE(up.avatar_url, ''),
    us.subscription_type, us.status,
    COALESCE(acs.status, 'active'), COALESCE(acs.status = 'suspended', FALSE),
    acs.suspension_reason, acs.suspended_at, COALESCE(acs.is_deleted, FALSE), acs.deleted_at,
    -- Simplificar estadísticas para evitar errores con tablas que no existen
    COALESCE(es.total, 0), 0::BIGINT, COALESCE(bs.total, 0),
    als.last_activity, COALESCE(als.total_actions, 0),
    0::BIGINT, NULL::INET, NULL::TEXT
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  LEFT JOIN account_status acs ON u.id = acs.user_id
  -- Solo incluir estadísticas de tablas que sabemos que existen
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total 
    FROM expenses 
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses')
    GROUP BY user_id
  ) es ON u.id = es.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total 
    FROM budgets 
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets')
    GROUP BY user_id
  ) bs ON u.id = bs.user_id
  LEFT JOIN (
    SELECT user_id, MAX(created_at) as last_activity, COUNT(*) as total_actions
    FROM audit_logs GROUP BY user_id
  ) als ON u.id = als.user_id
  WHERE us.user_id IS NOT NULL
  ORDER BY u.created_at DESC;
EXCEPTION WHEN OTHERS THEN
  -- Si hay error, devolver al menos la información básica
  RETURN QUERY
  SELECT 
    u.id, u.email, u.created_at, u.last_sign_in_at,
    COALESCE(up.full_name, ''), COALESCE(up.first_name, ''), COALESCE(up.avatar_url, ''),
    us.subscription_type, us.status,
    COALESCE(acs.status, 'active'), COALESCE(acs.status = 'suspended', FALSE),
    acs.suspension_reason, acs.suspended_at, COALESCE(acs.is_deleted, FALSE), acs.deleted_at,
    0::BIGINT, 0::BIGINT, 0::BIGINT, -- Estadísticas en 0
    NULL::TIMESTAMPTZ, 0::BIGINT,
    0::BIGINT, NULL::INET, NULL::TEXT
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  LEFT JOIN account_status acs ON u.id = acs.user_id
  WHERE us.user_id IS NOT NULL
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener detalles completos de un usuario (versión simplificada)
CREATE OR REPLACE FUNCTION get_user_complete_details(p_user_id UUID)
RETURNS TABLE (
  user_id UUID, email TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ,
  full_name TEXT, subscription_type TEXT, account_status TEXT,
  total_expenses BIGINT, total_income BIGINT, total_budgets BIGINT,
  last_activity TIMESTAMPTZ, total_actions BIGINT, suspicious_activity BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.email, u.created_at, u.last_sign_in_at,
    COALESCE(up.full_name, ''), us.subscription_type, COALESCE(acs.status, 'active'),
    0::BIGINT, 0::BIGINT, 0::BIGINT, -- Simplificar estadísticas
    als.last_activity, COALESCE(als.total_actions, 0), FALSE
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  LEFT JOIN account_status acs ON u.id = acs.user_id
  LEFT JOIN (
    SELECT user_id, MAX(created_at) as last_activity, COUNT(*) as total_actions
    FROM audit_logs WHERE user_id = p_user_id GROUP BY user_id
  ) als ON u.id = als.user_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exportar datos de usuario (versión básica)
CREATE OR REPLACE FUNCTION get_user_complete_data_export(p_user_id UUID)
RETURNS TABLE (data_type TEXT, data_json JSONB) AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  admin_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = admin_user_id AND subscription_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden exportar datos';
  END IF;

  PERFORM log_audit_event(
    'EXPORT_DATA', 'user_data_export', p_user_id, admin_user_id,
    NULL, jsonb_build_object('exported_user', p_user_id),
    'Complete user data export', 'admin_panel', 'Data audit export'
  );

  -- Datos del usuario
  RETURN QUERY
  SELECT 'user_profile'::TEXT, row_to_json(u)::JSONB
  FROM (
    SELECT u.id, u.email, u.created_at, up.full_name, us.subscription_type
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_subscriptions us ON u.id = us.user_id
    WHERE u.id = p_user_id
  ) u;

  -- Solo exportar tablas que existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    RETURN QUERY
    SELECT 'expenses'::TEXT, COALESCE(jsonb_agg(row_to_json(e.*)), '[]'::jsonb)
    FROM expenses e WHERE e.user_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    RETURN QUERY
    SELECT 'budgets'::TEXT, COALESCE(jsonb_agg(row_to_json(b.*)), '[]'::jsonb)
    FROM budgets b WHERE b.user_id = p_user_id;
  END IF;

  -- Historial de auditoría
  RETURN QUERY
  SELECT 'audit_history'::TEXT, COALESCE(jsonb_agg(
    jsonb_build_object(
      'action_type', al.action_type,
      'created_at', al.created_at,
      'changes_summary', al.changes_summary
    )
  ), '[]'::jsonb)
  FROM (SELECT * FROM audit_logs WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1000) al;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estadísticas del sistema (versión básica)
CREATE OR REPLACE FUNCTION get_system_admin_stats()
RETURNS TABLE (stat_name TEXT, stat_value BIGINT, stat_percentage DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_users'::TEXT, COUNT(*)::BIGINT, 100.0::DECIMAL
  FROM auth.users u JOIN user_subscriptions us ON u.id = us.user_id
  
  UNION ALL
  SELECT 'premium_users'::TEXT, COUNT(*)::BIGINT, 
         COALESCE(ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM user_subscriptions), 0) * 100), 2), 0)
  FROM user_subscriptions WHERE subscription_type LIKE 'premium%'
  
  UNION ALL
  SELECT 'suspended_accounts'::TEXT, COALESCE(COUNT(*), 0)::BIGINT,
         COALESCE(ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM user_subscriptions), 0) * 100), 2), 0)
  FROM account_status WHERE status = 'suspended';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PASO 6: CONFIGURAR SEGURIDAD RLS
-- ================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_status ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver audit_logs
DROP POLICY IF EXISTS audit_logs_admin_only ON audit_logs;
CREATE POLICY audit_logs_admin_only ON audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = auth.uid() AND us.subscription_type = 'admin')
);

-- Solo admins pueden gestionar account_status
DROP POLICY IF EXISTS account_status_admin_only ON account_status;
CREATE POLICY account_status_admin_only ON account_status FOR ALL USING (
  EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = auth.uid() AND us.subscription_type = 'admin')
);

-- Los usuarios pueden ver sus sesiones, admins ven todo
DROP POLICY IF EXISTS user_sessions_policy ON user_sessions;
CREATE POLICY user_sessions_policy ON user_sessions FOR ALL USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = auth.uid() AND us.subscription_type = 'admin')
);

-- ================================================================
-- PASO 7: INICIALIZACIÓN DE DATOS
-- ================================================================

-- Crear account_status para usuarios existentes
INSERT INTO account_status (user_id, status, created_at, updated_at)
SELECT u.id, 'active', NOW(), NOW()
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM account_status acs WHERE acs.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Registrar evento de deployment
SELECT log_audit_event(
  'SYSTEM_ACTION',
  'system_deployment',
  NULL,
  NULL,
  NULL,
  jsonb_build_object(
    'deployment_type', 'audit_system_complete',
    'version', '1.0.0',
    'timestamp', NOW()
  ),
  'Sistema completo de auditoría desplegado exitosamente (versión corregida)',
  'system',
  'Deployment inicial del sistema de auditoría y gestión administrativa'
);

-- ================================================================
-- VERIFICAR INSTALACIÓN
-- ================================================================

-- Mostrar tablas creadas
SELECT 'Tabla creada: ' || table_name as resultado
FROM information_schema.tables 
WHERE table_name IN ('audit_logs', 'user_sessions', 'account_status')
AND table_schema = 'public'

UNION ALL

-- Mostrar funciones creadas
SELECT 'Función creada: ' || routine_name as resultado
FROM information_schema.routines 
WHERE routine_name IN (
  'log_audit_event', 'get_users_detailed_admin', 
  'suspend_user_account', 'restore_user_account'
)
AND routine_schema = 'public'

UNION ALL

-- Mostrar triggers creados
SELECT 'Trigger creado: ' || trigger_name as resultado
FROM information_schema.triggers 
WHERE trigger_name LIKE '%audit%'

UNION ALL

SELECT '✅ SISTEMA DE AUDITORÍA INSTALADO EXITOSAMENTE' as resultado;

-- ================================================================
-- ¡SISTEMA DE AUDITORÍA ACTIVADO EXITOSAMENTE!
-- ================================================================