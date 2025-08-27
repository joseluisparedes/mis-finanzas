-- ================================================================
-- SISTEMA COMPLETO DE AUDITORÍA Y LOGGING PARA MISFINANZAS
-- ================================================================
-- Autor: Sistema automatizado
-- Fecha: 2025-08-27
-- Descripción: Sistema completo para rastrear todos los cambios en BD

-- ================================================================
-- 1. TABLA PRINCIPAL DE AUDITORÍA
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información de la acción
  action_type VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, PAYMENT, etc.
  table_name VARCHAR(100) NOT NULL, -- Tabla afectada
  record_id UUID, -- ID del registro afectado (si aplica)
  
  -- Información del usuario
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Detalles del cambio
  old_values JSONB, -- Valores anteriores (para UPDATE y DELETE)
  new_values JSONB, -- Valores nuevos (para INSERT y UPDATE)
  changes_summary TEXT, -- Resumen legible de los cambios
  
  -- Metadatos técnicos
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  
  -- Información contextual
  operation_source VARCHAR(100), -- 'web_app', 'admin_panel', 'api', 'system'
  operation_reason TEXT, -- Motivo del cambio si es relevante
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsquedas eficientes
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'INSERT', 'UPDATE', 'DELETE', 
    'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
    'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SUBSCRIPTION_CHANGED',
    'ACCOUNT_SUSPENDED', 'ACCOUNT_RESTORED', 'ACCOUNT_DELETED',
    'EXPORT_DATA', 'ADMIN_ACTION', 'SYSTEM_ACTION'
  ))
);

-- Índices optimizados para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(user_id, created_at DESC, action_type);

-- ================================================================
-- 2. TABLA DE SESSIONS PARA TRACKING AVANZADO
-- ================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  
  -- Información de la sesión
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  
  -- Timestamps de actividad
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Estado de la sesión
  is_active BOOLEAN DEFAULT TRUE,
  logout_reason VARCHAR(100),
  
  -- Índices
  CONSTRAINT valid_logout_reason CHECK (logout_reason IN (
    'user_logout', 'session_expired', 'admin_terminated', 'security_breach', 'duplicate_session'
  ))
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;

-- ================================================================
-- 3. TABLA DE ESTADO DE CUENTAS
-- ================================================================

CREATE TABLE IF NOT EXISTS account_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Estado actual de la cuenta
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  suspension_reason TEXT,
  suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at TIMESTAMP WITH TIME ZONE,
  
  -- Información de eliminación (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Configuraciones de cuenta
  data_retention_days INTEGER DEFAULT 365,
  export_allowed BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'pending_deletion', 'deleted')),
  CONSTRAINT suspension_logic CHECK (
    (status = 'suspended' AND suspended_at IS NOT NULL) OR 
    (status != 'suspended')
  ),
  CONSTRAINT deletion_logic CHECK (
    (is_deleted = TRUE AND deleted_at IS NOT NULL) OR 
    (is_deleted = FALSE)
  )
);

CREATE INDEX IF NOT EXISTS idx_account_status_status ON account_status(status);
CREATE INDEX IF NOT EXISTS idx_account_status_deleted ON account_status(is_deleted) WHERE is_deleted = TRUE;

-- ================================================================
-- 4. FUNCIÓN GENÉRICA PARA LOGGING
-- ================================================================

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
  -- Obtener información del usuario si se proporciona
  IF p_user_id IS NOT NULL THEN
    SELECT email INTO current_user_email
    FROM auth.users 
    WHERE id = p_user_id;
    
    SELECT subscription_type INTO current_user_role
    FROM user_subscriptions 
    WHERE user_id = p_user_id;
  END IF;

  -- Insertar en audit_logs
  INSERT INTO audit_logs (
    action_type, table_name, record_id,
    user_id, user_email, user_role,
    old_values, new_values, changes_summary,
    ip_address, user_agent,
    operation_source, operation_reason
  ) VALUES (
    p_action_type, p_table_name, p_record_id,
    p_user_id, current_user_email, current_user_role,
    p_old_values, p_new_values, p_changes_summary,
    p_ip_address, p_user_agent,
    p_operation_source, p_operation_reason
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. TRIGGERS AUTOMÁTICOS PARA TODAS LAS TABLAS PRINCIPALES
-- ================================================================

-- Función genérica de trigger para auditoría
CREATE OR REPLACE FUNCTION trigger_audit_log() RETURNS TRIGGER AS $$
DECLARE
  operation_type TEXT;
  old_values JSONB := NULL;
  new_values JSONB := NULL;
  changes_text TEXT := '';
  current_user_id UUID;
BEGIN
  -- Determinar tipo de operación
  operation_type := TG_OP;
  
  -- Obtener user_id actual (si está disponible)
  current_user_id := auth.uid();
  
  -- Preparar valores old/new según la operación
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

  -- Registrar en audit_logs
  PERFORM log_audit_event(
    operation_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::UUID,
    current_user_id,
    old_values,
    new_values,
    changes_text,
    'database_trigger',
    NULL
  );

  -- Retornar el registro apropiado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear triggers para todas las tablas principales
CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_income_trigger
  AFTER INSERT OR UPDATE OR DELETE ON income
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_budgets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_payment_methods_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_user_subscriptions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_user_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- ================================================================
-- 6. FUNCIONES DE CONSULTA PARA ADMINISTRADORES
-- ================================================================

-- Obtener historial completo de un usuario
CREATE OR REPLACE FUNCTION get_user_audit_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  action_type TEXT,
  table_name TEXT,
  changes_summary TEXT,
  created_at TIMESTAMPTZ,
  operation_source TEXT,
  ip_address INET
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action_type,
    al.table_name,
    al.changes_summary,
    al.created_at,
    al.operation_source,
    al.ip_address
  FROM audit_logs al
  WHERE al.user_id = p_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estadísticas de actividad por usuario
CREATE OR REPLACE FUNCTION get_user_activity_stats(p_user_id UUID)
RETURNS TABLE (
  total_actions BIGINT,
  last_activity TIMESTAMPTZ,
  actions_today BIGINT,
  actions_this_week BIGINT,
  most_common_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_actions,
    MAX(al.created_at) as last_activity,
    COUNT(*) FILTER (WHERE al.created_at >= CURRENT_DATE) as actions_today,
    COUNT(*) FILTER (WHERE al.created_at >= CURRENT_DATE - INTERVAL '7 days') as actions_this_week,
    MODE() WITHIN GROUP (ORDER BY al.action_type) as most_common_action
  FROM audit_logs al
  WHERE al.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. FUNCIONES PARA ADMINISTRACIÓN DE CUENTAS
-- ================================================================

-- Suspender cuenta de usuario
CREATE OR REPLACE FUNCTION suspend_user_account(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Actualizar estado de la cuenta
  INSERT INTO account_status (user_id, status, suspension_reason, suspended_by, suspended_at)
  VALUES (p_user_id, 'suspended', p_reason, p_admin_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = 'suspended',
    suspension_reason = p_reason,
    suspended_by = p_admin_id,
    suspended_at = NOW(),
    updated_at = NOW();

  -- Registrar en audit log
  PERFORM log_audit_event(
    'ACCOUNT_SUSPENDED',
    'account_status',
    p_user_id,
    p_admin_id,
    NULL,
    jsonb_build_object('reason', p_reason),
    'Account suspended by admin: ' || p_reason,
    'admin_panel',
    p_reason
  );

  -- Terminar sesiones activas del usuario
  UPDATE user_sessions 
  SET is_active = FALSE, logout_reason = 'admin_terminated'
  WHERE user_id = p_user_id AND is_active = TRUE;

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restaurar cuenta suspendida
CREATE OR REPLACE FUNCTION restore_user_account(
  p_user_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Actualizar estado de la cuenta
  UPDATE account_status 
  SET 
    status = 'active',
    suspension_reason = NULL,
    suspended_by = NULL,
    suspended_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar en audit log
  PERFORM log_audit_event(
    'ACCOUNT_RESTORED',
    'account_status',
    p_user_id,
    p_admin_id,
    NULL,
    NULL,
    'Account restored by admin',
    'admin_panel',
    'Account restoration'
  );

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminación soft de cuenta
CREATE OR REPLACE FUNCTION soft_delete_user_account(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Actualizar estado de la cuenta
  UPDATE account_status 
  SET 
    status = 'deleted',
    is_deleted = TRUE,
    deleted_reason = p_reason,
    deleted_by = p_admin_id,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar en audit log
  PERFORM log_audit_event(
    'ACCOUNT_DELETED',
    'account_status',
    p_user_id,
    p_admin_id,
    NULL,
    jsonb_build_object('reason', p_reason),
    'Account deleted by admin: ' || p_reason,
    'admin_panel',
    p_reason
  );

  -- Terminar todas las sesiones
  UPDATE user_sessions 
  SET is_active = FALSE, logout_reason = 'admin_terminated'
  WHERE user_id = p_user_id AND is_active = TRUE;

  success := TRUE;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. POLÍTICAS RLS PARA SEGURIDAD
-- ================================================================

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_status ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver audit_logs
CREATE POLICY audit_logs_admin_only ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions us 
      WHERE us.user_id = auth.uid() 
      AND us.subscription_type = 'admin'
    )
  );

-- Los usuarios pueden ver sus propias sesiones, admins ven todo
CREATE POLICY user_sessions_policy ON user_sessions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_subscriptions us 
      WHERE us.user_id = auth.uid() 
      AND us.subscription_type = 'admin'
    )
  );

-- Solo admins pueden gestionar account_status
CREATE POLICY account_status_admin_only ON account_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions us 
      WHERE us.user_id = auth.uid() 
      AND us.subscription_type = 'admin'
    )
  );

-- ================================================================
-- 9. ÍNDICES ADICIONALES PARA PERFORMANCE
-- ================================================================

-- Índice parcial para búsquedas de cuentas suspendidas
CREATE INDEX IF NOT EXISTS idx_account_status_suspended 
ON account_status(suspended_at DESC) 
WHERE status = 'suspended';

-- Índice para búsquedas de audit por rango de fechas
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_range 
ON audit_logs(created_at, user_id) 
WHERE created_at >= '2025-01-01';

-- ================================================================
-- 10. COMENTARIOS PARA DOCUMENTACIÓN
-- ================================================================

COMMENT ON TABLE audit_logs IS 'Registro completo de todas las acciones y cambios en el sistema';
COMMENT ON TABLE user_sessions IS 'Tracking de sesiones activas de usuarios para seguridad';
COMMENT ON TABLE account_status IS 'Estado y gestión administrativa de cuentas de usuario';

COMMENT ON FUNCTION log_audit_event IS 'Función principal para registrar eventos de auditoría';
COMMENT ON FUNCTION suspend_user_account IS 'Suspende una cuenta de usuario por parte de admin';
COMMENT ON FUNCTION restore_user_account IS 'Restaura una cuenta previamente suspendida';
COMMENT ON FUNCTION soft_delete_user_account IS 'Eliminación soft de cuenta manteniendo logs';

-- ================================================================
-- SISTEMA DE AUDITORÍA COMPLETADO
-- ================================================================
-- ✅ Tablas de auditoría creadas
-- ✅ Triggers automáticos instalados  
-- ✅ Funciones de gestión implementadas
-- ✅ Políticas de seguridad aplicadas
-- ✅ Índices optimizados creados
-- ✅ Sistema listo para administración avanzada