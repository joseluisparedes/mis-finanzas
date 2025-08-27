-- ENVIAR EMAIL MANUAL DE BIENVENIDA PREMIUM
-- Ejecutar en Supabase SQL Editor

-- Insertar registro de email manual
INSERT INTO email_notifications (
  user_id,
  email_type,
  recipient_email,
  status,
  template_data,
  created_at,
  sent_at
) VALUES (
  (SELECT user_id FROM user_subscriptions us 
   JOIN auth.users au ON us.user_id = au.id 
   WHERE au.email = 'contacto.intrusosgamers@gmail.com' 
   LIMIT 1),
  'welcome_premium',
  'contacto.intrusosgamers@gmail.com',
  'pending', -- Cambiará a 'sent' después
  jsonb_build_object(
    'user_name', 'Usuario Premium',
    'plan_name', 'Premium',
    'amount', '15',
    'manual_send', true,
    'premium_features', jsonb_build_array(
      'Transacciones ilimitadas',
      'Multi-moneda PEN/USD', 
      'Exportar Excel completo',
      'Análisis avanzados',
      'Soporte prioritario'
    )
  ),
  NOW(),
  NULL
);

-- Verificar que se insertó
SELECT * FROM email_notifications 
WHERE recipient_email = 'contacto.intrusosgamers@gmail.com'
ORDER BY created_at DESC;