-- ================================================================
-- SCRIPT DE DEPLOYMENT COMPLETO PARA SISTEMA DE AUDITORÍA
-- ================================================================
-- Autor: Sistema automatizado
-- Fecha: 2025-08-27
-- Descripción: Aplicar todo el sistema de auditoría y gestión avanzada
-- 
-- INSTRUCCIONES:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Verificar que todas las operaciones se completen sin errores
-- 3. Probar las nuevas funciones desde la aplicación
-- ================================================================

-- PASO 1: Crear tablas del sistema de auditoría
\echo '🔧 PASO 1: Creando tablas del sistema de auditoría...'

-- Ejecutar el contenido de audit_system_complete.sql
\i audit_system_complete.sql

-- PASO 2: Crear funciones RPC para administración
\echo '🔧 PASO 2: Creando funciones RPC administrativas...'

-- Ejecutar el contenido de admin_rpc_functions.sql  
\i admin_rpc_functions.sql

-- PASO 3: Inicializar datos base
\echo '🔧 PASO 3: Inicializando datos base...'

-- Asegurarse de que todos los usuarios existentes tengan un account_status
INSERT INTO account_status (user_id, status, created_at, updated_at)
SELECT 
  u.id,
  'active',
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM account_status acs 
  WHERE acs.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- PASO 4: Registrar evento de deployment en audit
\echo '🔧 PASO 4: Registrando deployment en audit log...'

SELECT log_audit_event(
  'SYSTEM_ACTION',
  'system_deployment',
  NULL,
  NULL,
  NULL,
  jsonb_build_object(
    'deployment_type', 'audit_system_complete',
    'version', '1.0.0',
    'features', jsonb_build_array(
      'audit_logs_table',
      'user_sessions_table', 
      'account_status_table',
      'automatic_triggers',
      'admin_rpc_functions',
      'advanced_user_management'
    )
  ),
  'Sistema completo de auditoría y gestión administrativa desplegado',
  'system',
  'Deployment automático del sistema de auditoría'
) AS deployment_audit_id;

-- PASO 5: Verificar deployment
\echo '🔧 PASO 5: Verificando deployment...'

-- Contar tablas creadas
SELECT 
  'audit_logs' as tabla,
  COUNT(*) as existe
FROM information_schema.tables 
WHERE table_name = 'audit_logs'

UNION ALL

SELECT 
  'user_sessions' as tabla,
  COUNT(*) as existe  
FROM information_schema.tables 
WHERE table_name = 'user_sessions'

UNION ALL

SELECT 
  'account_status' as tabla,
  COUNT(*) as existe
FROM information_schema.tables 
WHERE table_name = 'account_status';

-- Contar funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'log_audit_event',
  'get_users_detailed_admin', 
  'get_user_complete_details',
  'get_user_complete_data_export',
  'get_system_admin_stats',
  'suspend_user_account',
  'restore_user_account',
  'soft_delete_user_account'
)
ORDER BY routine_name;

-- Contar triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%audit%'
ORDER BY event_object_table;

-- Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('audit_logs', 'user_sessions', 'account_status')
ORDER BY tablename, policyname;

\echo '✅ DEPLOYMENT COMPLETADO EXITOSAMENTE'
\echo ''
\echo '📊 RESUMEN DEL SISTEMA IMPLEMENTADO:'
\echo '  ✅ Tablas de auditoría: audit_logs, user_sessions, account_status'
\echo '  ✅ Triggers automáticos en todas las tablas principales'
\echo '  ✅ Funciones RPC para gestión administrativa'
\echo '  ✅ Políticas de seguridad RLS implementadas'
\echo '  ✅ Sistema de logging automático activado'
\echo ''
\echo '🚀 FUNCIONALIDADES DISPONIBLES:'
\echo '  • Auditoría completa de todos los cambios'
\echo '  • Gestión avanzada de usuarios (suspender/eliminar)'
\echo '  • Exportación completa de datos de usuario'
\echo '  • Dashboard administrativo con estadísticas'
\echo '  • Tracking de sesiones y seguridad'
\echo ''
\echo '⚠️  IMPORTANTE:'
\echo '  • Solo administradores pueden acceder a funciones de gestión'
\echo '  • Todos los cambios quedan registrados en audit_logs'
\echo '  • Las eliminaciones son "soft delete" (no se pierde información)'
\echo '  • El sistema está listo para auditorías de cumplimiento'

-- ================================================================
-- DEPLOYMENT SCRIPT COMPLETADO
-- ================================================================