-- TEST CON DOMINIO CORREGIDO
-- Ejecutar DESPUÉS del fix anterior

-- Test de envío con el dominio corregido (onboarding@resend.dev)
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
  'pending', -- Este debería procesarse correctamente ahora
  jsonb_build_object(
    'user_name', 'contacto intrusos',
    'plan_name', 'Premium Early Bird',
    'amount', '5',
    'test_corrected_domain', true,
    'sent_time', NOW()::text
  ),
  NOW()
);

-- Ver el resultado
SELECT * FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
ORDER BY created_at DESC;