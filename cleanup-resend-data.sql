-- LIMPIEZA COMPLETA DE DATOS DE RESEND
-- Ejecutar en Supabase SQL Editor para eliminar todos los rastros de Resend

-- 1. Limpiar todos los emails fallidos de Resend
DELETE FROM email_notifications 
WHERE status = 'failed' 
   AND (error_message ILIKE '%resend%' 
        OR error_message ILIKE '%domain%' 
        OR error_message ILIKE '%403%'
        OR error_message ILIKE '%forbidden%');

-- 2. Limpiar emails pendientes que nunca se enviaron por problemas de Resend
DELETE FROM email_notifications 
WHERE status = 'pending' 
   AND created_at < NOW() - INTERVAL '1 hour'; -- Emails pendientes hace más de 1 hora

-- 3. Actualizar emails que se marcaron como "sent" pero realmente fallaron
UPDATE email_notifications 
SET status = 'cleaned_resend_error',
    error_message = 'Limpiado - era un error de Resend',
    updated_at = NOW()
WHERE resend_message_id IS NOT NULL 
   AND resend_message_id LIKE 're_%' -- IDs típicos de Resend
   AND status = 'sent'
   AND sent_at IS NULL; -- Sin timestamp real de envío

-- 4. Opcional: Eliminar completamente registros de pruebas de Resend
DELETE FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
   AND template_data::text ILIKE '%test%';

-- 5. Resetear contadores/estadísticas relacionadas con Resend si existen
-- (Ajustar según tu esquema específico)

-- 6. Ver el estado final limpio
SELECT 
  status,
  COUNT(*) as cantidad,
  MIN(created_at) as primer_email,
  MAX(created_at) as ultimo_email
FROM email_notifications 
GROUP BY status
ORDER BY status;

-- 7. Ver emails exitosos reales (no de Resend)
SELECT 
  id,
  email_type,
  recipient_email,
  status,
  sent_at,
  template_data->>'user_name' as usuario
FROM email_notifications 
WHERE status = 'sent' 
   AND sent_at IS NOT NULL
   AND (resend_message_id IS NULL OR resend_message_id NOT LIKE 're_%')
ORDER BY sent_at DESC;

-- RESULTADO ESPERADO:
-- - 0 emails con errores de Resend
-- - Solo emails reales exitosos o nuevos emails de Gmail
-- - Base de datos limpia para el nuevo sistema Gmail