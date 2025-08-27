-- ================================================================
-- FUNCIONES RPC PARA DASHBOARD DE ADMINISTRACIÓN AVANZADO
-- ================================================================
-- Autor: Sistema automatizado
-- Fecha: 2025-08-27
-- Descripción: Funciones específicas para gestión administrativa

-- ================================================================
-- 1. OBTENER LISTA COMPLETA DE USUARIOS CON DETALLES
-- ================================================================

CREATE OR REPLACE FUNCTION get_users_detailed_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  
  -- Perfil
  full_name TEXT,
  first_name TEXT,
  avatar_url TEXT,
  
  -- Suscripción
  subscription_type TEXT,
  subscription_status TEXT,
  subscription_created_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Estado de cuenta
  account_status TEXT,
  is_suspended BOOLEAN,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  
  -- Estadísticas de uso
  total_expenses BIGINT,
  total_income BIGINT,
  total_budgets BIGINT,
  last_activity TIMESTAMPTZ,
  total_actions BIGINT,
  
  -- Información de sesión
  current_sessions BIGINT,
  last_ip INET,
  last_user_agent TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    
    -- Perfil
    up.full_name,
    up.first_name,
    up.avatar_url,
    
    -- Suscripción
    us.subscription_type,
    us.status as subscription_status,
    us.created_at as subscription_created_at,
    us.expires_at as subscription_expires_at,
    
    -- Estado de cuenta
    COALESCE(acs.status, 'active') as account_status,
    COALESCE(acs.status = 'suspended', FALSE) as is_suspended,
    acs.suspension_reason,
    acs.suspended_at,
    COALESCE(acs.is_deleted, FALSE) as is_deleted,
    acs.deleted_at,
    
    -- Estadísticas de uso
    COALESCE(expense_stats.total, 0) as total_expenses,
    COALESCE(income_stats.total, 0) as total_income,
    COALESCE(budget_stats.total, 0) as total_budgets,
    audit_stats.last_activity,
    COALESCE(audit_stats.total_actions, 0) as total_actions,
    
    -- Información de sesión
    COALESCE(session_stats.current_sessions, 0) as current_sessions,
    session_stats.last_ip,
    session_stats.last_user_agent
    
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  LEFT JOIN account_status acs ON u.id = acs.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total
    FROM expenses
    GROUP BY user_id
  ) expense_stats ON u.id = expense_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total
    FROM income
    GROUP BY user_id
  ) income_stats ON u.id = income_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total
    FROM budgets
    GROUP BY user_id
  ) budget_stats ON u.id = budget_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      MAX(created_at) as last_activity,
      COUNT(*) as total_actions
    FROM audit_logs
    GROUP BY user_id
  ) audit_stats ON u.id = audit_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_active = TRUE) as current_sessions,
      MAX(ip_address) as last_ip,
      MAX(user_agent) as last_user_agent
    FROM user_sessions
    GROUP BY user_id
  ) session_stats ON u.id = session_stats.user_id
  
  -- Solo mostrar usuarios con suscripción (excluir usuarios fantasma)
  WHERE us.user_id IS NOT NULL
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. OBTENER DETALLES COMPLETOS DE UN USUARIO ESPECÍFICO
-- ================================================================

CREATE OR REPLACE FUNCTION get_user_complete_details(p_user_id UUID)
RETURNS TABLE (
  -- Información básica
  user_id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  
  -- Perfil completo
  full_name TEXT,
  first_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  
  -- Suscripción detallada
  subscription_type TEXT,
  subscription_status TEXT,
  subscription_created_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  subscription_metadata JSONB,
  
  -- Estado de cuenta
  account_status TEXT,
  suspension_reason TEXT,
  suspended_by UUID,
  suspended_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  deleted_reason TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ,
  
  -- Estadísticas financieras
  total_expenses BIGINT,
  total_expense_amount DECIMAL,
  total_income BIGINT,
  total_income_amount DECIMAL,
  total_budgets BIGINT,
  active_budgets BIGINT,
  total_categories BIGINT,
  total_payment_methods BIGINT,
  
  -- Actividad reciente
  last_activity TIMESTAMPTZ,
  total_actions BIGINT,
  actions_last_30_days BIGINT,
  most_common_action TEXT,
  
  -- Sesiones y seguridad
  current_active_sessions BIGINT,
  total_sessions BIGINT,
  last_ip INET,
  last_user_agent TEXT,
  suspicious_activity BOOLEAN
) AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Verificar que el usuario existe
  SELECT INTO user_record *
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;

  RETURN QUERY
  SELECT 
    -- Información básica
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.updated_at,
    u.last_sign_in_at,
    
    -- Perfil completo
    up.full_name,
    up.first_name,
    up.avatar_url,
    u.phone,
    
    -- Suscripción detallada
    us.subscription_type,
    us.status as subscription_status,
    us.created_at as subscription_created_at,
    us.expires_at as subscription_expires_at,
    us.metadata as subscription_metadata,
    
    -- Estado de cuenta
    COALESCE(acs.status, 'active') as account_status,
    acs.suspension_reason,
    acs.suspended_by,
    acs.suspended_at,
    COALESCE(acs.is_deleted, FALSE) as is_deleted,
    acs.deleted_reason,
    acs.deleted_by,
    acs.deleted_at,
    
    -- Estadísticas financieras
    COALESCE(expense_stats.total_count, 0) as total_expenses,
    COALESCE(expense_stats.total_amount, 0) as total_expense_amount,
    COALESCE(income_stats.total_count, 0) as total_income,
    COALESCE(income_stats.total_amount, 0) as total_income_amount,
    COALESCE(budget_stats.total_count, 0) as total_budgets,
    COALESCE(budget_stats.active_count, 0) as active_budgets,
    COALESCE(category_stats.total_count, 0) as total_categories,
    COALESCE(payment_stats.total_count, 0) as total_payment_methods,
    
    -- Actividad reciente
    audit_stats.last_activity,
    COALESCE(audit_stats.total_actions, 0) as total_actions,
    COALESCE(audit_stats.actions_last_30_days, 0) as actions_last_30_days,
    audit_stats.most_common_action,
    
    -- Sesiones y seguridad
    COALESCE(session_stats.active_sessions, 0) as current_active_sessions,
    COALESCE(session_stats.total_sessions, 0) as total_sessions,
    session_stats.last_ip,
    session_stats.last_user_agent,
    COALESCE(security_stats.suspicious_activity, FALSE) as suspicious_activity
    
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  LEFT JOIN account_status acs ON u.id = acs.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      COUNT(*) as total_count,
      SUM(amount) as total_amount
    FROM expenses
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) expense_stats ON u.id = expense_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      COUNT(*) as total_count,
      SUM(amount) as total_amount
    FROM income
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) income_stats ON u.id = income_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE is_active = TRUE) as active_count
    FROM budgets
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) budget_stats ON u.id = budget_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_count
    FROM categories
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) category_stats ON u.id = category_stats.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_count
    FROM payment_methods
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) payment_stats ON u.id = payment_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      MAX(created_at) as last_activity,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as actions_last_30_days,
      MODE() WITHIN GROUP (ORDER BY action_type) as most_common_action
    FROM audit_logs
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) audit_stats ON u.id = audit_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_active = TRUE) as active_sessions,
      COUNT(*) as total_sessions,
      MAX(ip_address) as last_ip,
      MAX(user_agent) as last_user_agent
    FROM user_sessions
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) session_stats ON u.id = session_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      BOOL_OR(
        action_type IN ('FAILED_LOGIN', 'SECURITY_BREACH') OR
        (created_at >= NOW() - INTERVAL '1 hour' AND 
         action_type = 'LOGIN' AND 
         (SELECT COUNT(*) FROM audit_logs al2 
          WHERE al2.user_id = audit_logs.user_id 
          AND al2.action_type = 'LOGIN' 
          AND al2.created_at >= NOW() - INTERVAL '1 hour') > 10)
      ) as suspicious_activity
    FROM audit_logs
    WHERE user_id = p_user_id
    GROUP BY user_id
  ) security_stats ON u.id = security_stats.user_id
  
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. EXPORTAR TODOS LOS DATOS DE UN USUARIO
-- ================================================================

CREATE OR REPLACE FUNCTION get_user_complete_data_export(p_user_id UUID)
RETURNS TABLE (
  data_type TEXT,
  data_json JSONB
) AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Verificar que quien ejecuta es admin
  admin_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = admin_user_id 
    AND subscription_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden exportar datos de usuarios';
  END IF;

  -- Registrar la exportación en audit
  PERFORM log_audit_event(
    'EXPORT_DATA',
    'user_data_export',
    p_user_id,
    admin_user_id,
    NULL,
    jsonb_build_object('exported_user', p_user_id),
    'Complete user data export requested',
    'admin_panel',
    'Data audit export'
  );

  -- Datos del usuario
  RETURN QUERY
  SELECT 
    'user_profile'::TEXT,
    row_to_json(combined_data)::JSONB
  FROM (
    SELECT 
      u.id as user_id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      up.full_name,
      up.first_name,
      up.avatar_url,
      us.subscription_type,
      us.status as subscription_status,
      COALESCE(acs.status, 'active') as account_status
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_subscriptions us ON u.id = us.user_id
    LEFT JOIN account_status acs ON u.id = acs.user_id
    WHERE u.id = p_user_id
  ) combined_data;

  -- Gastos
  RETURN QUERY
  SELECT 
    'expenses'::TEXT,
    jsonb_agg(row_to_json(e.*))
  FROM expenses e
  WHERE e.user_id = p_user_id;

  -- Ingresos
  RETURN QUERY
  SELECT 
    'income'::TEXT,
    jsonb_agg(row_to_json(i.*))
  FROM income i
  WHERE i.user_id = p_user_id;

  -- Presupuestos
  RETURN QUERY
  SELECT 
    'budgets'::TEXT,
    jsonb_agg(row_to_json(b.*))
  FROM budgets b
  WHERE b.user_id = p_user_id;

  -- Categorías
  RETURN QUERY
  SELECT 
    'categories'::TEXT,
    jsonb_agg(row_to_json(c.*))
  FROM categories c
  WHERE c.user_id = p_user_id;

  -- Métodos de pago
  RETURN QUERY
  SELECT 
    'payment_methods'::TEXT,
    jsonb_agg(row_to_json(pm.*))
  FROM payment_methods pm
  WHERE pm.user_id = p_user_id;

  -- Historial de auditoría (últimos 1000 registros)
  RETURN QUERY
  SELECT 
    'audit_history'::TEXT,
    jsonb_agg(
      jsonb_build_object(
        'action_type', al.action_type,
        'table_name', al.table_name,
        'created_at', al.created_at,
        'operation_source', al.operation_source,
        'changes_summary', al.changes_summary,
        'ip_address', al.ip_address
      )
    )
  FROM (
    SELECT * FROM audit_logs 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT 1000
  ) al;

  -- Sesiones (últimas 50)
  RETURN QUERY
  SELECT 
    'user_sessions'::TEXT,
    jsonb_agg(
      jsonb_build_object(
        'created_at', us.created_at,
        'last_activity', us.last_activity,
        'ip_address', us.ip_address,
        'is_active', us.is_active,
        'logout_reason', us.logout_reason
      )
    )
  FROM (
    SELECT * FROM user_sessions 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT 50
  ) us;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. ESTADÍSTICAS GENERALES DEL SISTEMA
-- ================================================================

CREATE OR REPLACE FUNCTION get_system_admin_stats()
RETURNS TABLE (
  stat_name TEXT,
  stat_value BIGINT,
  stat_percentage DECIMAL,
  stat_metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats_data AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '30 days') as active_users_30d,
      COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '7 days') as active_users_7d,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d
    FROM auth.users u
    JOIN user_subscriptions us ON u.id = us.user_id
  ),
  subscription_data AS (
    SELECT 
      COUNT(*) as total_subscriptions,
      COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
      COUNT(*) FILTER (WHERE subscription_type LIKE 'premium%') as premium_users,
      COUNT(*) FILTER (WHERE subscription_type = 'admin') as admin_users
    FROM user_subscriptions
  ),
  account_status_data AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'suspended') as suspended_accounts,
      COUNT(*) FILTER (WHERE is_deleted = TRUE) as deleted_accounts
    FROM account_status
  ),
  activity_data AS (
    SELECT 
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as actions_30d,
      COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as active_users_24h
    FROM audit_logs
  )
  
  SELECT 'total_users'::TEXT, sd.total_users, 100.0, jsonb_build_object('description', 'Total registered users')
  FROM stats_data sd
  
  UNION ALL
  SELECT 'active_users_30d'::TEXT, sd.active_users_30d, 
         ROUND((sd.active_users_30d::DECIMAL / NULLIF(sd.total_users, 0) * 100), 2),
         jsonb_build_object('description', 'Users active in last 30 days')
  FROM stats_data sd
  
  UNION ALL
  SELECT 'active_users_7d'::TEXT, sd.active_users_7d,
         ROUND((sd.active_users_7d::DECIMAL / NULLIF(sd.total_users, 0) * 100), 2),
         jsonb_build_object('description', 'Users active in last 7 days')
  FROM stats_data sd
  
  UNION ALL
  SELECT 'new_users_30d'::TEXT, sd.new_users_30d,
         ROUND((sd.new_users_30d::DECIMAL / NULLIF(sd.total_users, 0) * 100), 2),
         jsonb_build_object('description', 'New users in last 30 days')
  FROM stats_data sd
  
  UNION ALL
  SELECT 'premium_users'::TEXT, sub.premium_users,
         ROUND((sub.premium_users::DECIMAL / NULLIF(sub.total_subscriptions, 0) * 100), 2),
         jsonb_build_object('description', 'Premium subscribers')
  FROM subscription_data sub
  
  UNION ALL
  SELECT 'free_users'::TEXT, sub.free_users,
         ROUND((sub.free_users::DECIMAL / NULLIF(sub.total_subscriptions, 0) * 100), 2),
         jsonb_build_object('description', 'Free tier users')
  FROM subscription_data sub
  
  UNION ALL
  SELECT 'suspended_accounts'::TEXT, COALESCE(asd.suspended_accounts, 0),
         ROUND((COALESCE(asd.suspended_accounts, 0)::DECIMAL / NULLIF((SELECT total_users FROM stats_data), 0) * 100), 2),
         jsonb_build_object('description', 'Suspended accounts')
  FROM account_status_data asd
  
  UNION ALL
  SELECT 'total_actions'::TEXT, ad.total_actions, NULL,
         jsonb_build_object('description', 'Total system actions logged')
  FROM activity_data ad
  
  UNION ALL
  SELECT 'actions_30d'::TEXT, ad.actions_30d,
         ROUND((ad.actions_30d::DECIMAL / NULLIF(ad.total_actions, 0) * 100), 2),
         jsonb_build_object('description', 'Actions in last 30 days')
  FROM activity_data ad
  
  UNION ALL
  SELECT 'active_users_24h'::TEXT, ad.active_users_24h, NULL,
         jsonb_build_object('description', 'Unique active users in last 24 hours')
  FROM activity_data ad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. POLÍTICAS DE SEGURIDAD PARA LAS NUEVAS FUNCIONES
-- ================================================================

-- Solo admins pueden ejecutar estas funciones
REVOKE ALL ON FUNCTION get_users_detailed_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_complete_details(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_complete_data_export(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_system_admin_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_users_detailed_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_complete_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_complete_data_export(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_admin_stats() TO authenticated;

-- ================================================================
-- FUNCIONES RPC ADMINISTRATIVAS COMPLETADAS
-- ================================================================