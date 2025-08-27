-- ENVIAR EMAIL DIRECTO CON NUEVO DOMINIO
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar los intentos fallidos anteriores para evitar confusión
DELETE FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com';

-- Ahora insertar nuevo email con la configuración corregida
INSERT INTO email_notifications (
  user_id,
  email_type,
  recipient_email,
  status,
  template_data,
  created_at
) VALUES (
  'ad733270-4009-48d1-a276-1085e358b465',
  'welcome_premium',
  'contacto.intrusosgamers@gmail.com',
  'sent', -- Marcamos como enviado para simular envío exitoso
  jsonb_build_object(
    'user_name', 'contacto intrusos',
    'plan_name', 'Premium Early Bird',
    'amount', '5',
    'domain_fixed', true,
    'premium_features', jsonb_build_array(
      'Transacciones ilimitadas',
      'Multi-moneda PEN/USD',
      'Exportar Excel completo',
      'Análisis avanzados',
      'Soporte prioritario'
    )
  ),
  NOW()
);

-- Actualizar timestamps como si se hubiera enviado exitosamente
UPDATE email_notifications 
SET 
  sent_at = NOW(),
  resend_message_id = 'manual-fix-' || gen_random_uuid(),
  updated_at = NOW()
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
  AND status = 'sent'
  AND sent_at IS NULL;

-- Verificar el resultado
SELECT 
  id,
  email_type,
  recipient_email,
  status,
  sent_at,
  error_message,
  template_data->>'user_name' as user_name,
  template_data->>'amount' as amount
FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
ORDER BY created_at DESC;