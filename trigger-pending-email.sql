-- DISPARAR EMAIL PENDIENTE MANUALMENTE
-- Ejecutar en Supabase SQL Editor

-- 1. Ver el estado actual del email pendiente
SELECT 
  id,
  email_type,
  recipient_email,
  status,
  error_message,
  created_at
FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
ORDER BY created_at DESC;

-- 2. Resetear el email fallido para reintento
UPDATE email_notifications 
SET 
  status = 'pending',
  error_message = NULL,
  failed_at = NULL,
  updated_at = NOW()
WHERE id = '43a12aeb-e57d-49b2-a799-828472e215d7';

-- 3. Verificar que se actualizó
SELECT 
  id,
  status,
  error_message,
  updated_at
FROM email_notifications 
WHERE id = '43a12aeb-e57d-49b2-a799-828472e215d7';