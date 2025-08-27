-- DIAGNÓSTICO DEL PROBLEMA DE EMAILS
-- Ejecutar en Supabase SQL Editor

-- 1. Buscar el usuario premium recién creado
SELECT 
  us.user_id,
  us.subscription_type,
  us.created_at,
  au.email
FROM user_subscriptions us
LEFT JOIN auth.users au ON us.user_id = au.id
WHERE au.email = 'contacto.intrusosgamers@gmail.com'
   OR us.created_at > NOW() - INTERVAL '1 hour'
ORDER BY us.created_at DESC
LIMIT 5;

-- 2. Buscar intentos de envío de email para ese usuario
SELECT 
  en.id,
  en.user_id,
  en.email_type,
  en.recipient_email,
  en.status,
  en.error_message,
  en.template_data,
  en.created_at,
  en.sent_at,
  en.failed_at
FROM email_notifications en
WHERE en.recipient_email = 'contacto.intrusosgamers@gmail.com'
   OR en.created_at > NOW() - INTERVAL '1 hour'
ORDER BY en.created_at DESC
LIMIT 10;

-- 3. Verificar todos los emails enviados hoy
SELECT 
  email_type,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_attempt
FROM email_notifications 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY email_type, status
ORDER BY last_attempt DESC;

-- 4. Buscar errores recientes
SELECT 
  id,
  email_type,
  recipient_email,
  status,
  error_message,
  created_at
FROM email_notifications 
WHERE status IN ('failed', 'pending')
   AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. Verificar configuración de templates
SELECT 
  template_type,
  is_active,
  subject_template,
  sender_email
FROM email_templates
WHERE is_active = true;