-- TEST DIRECTO DE EMAIL DESDE SUPABASE
-- Ejecutar este SQL en Supabase Dashboard -> SQL Editor

-- 1. Insertar un email de prueba en la tabla de tracking
INSERT INTO email_notifications (
  user_id,
  email_type, 
  recipient_email,
  status,
  template_data,
  sent_at
) VALUES (
  NULL, -- Sistema
  'welcome_premium',
  'soporte@misfinanzas.com',
  'sent',
  jsonb_build_object(
    'user_name', 'Usuario Test',
    'plan_name', 'Premium Test',
    'amount', '15',
    'test_mode', true
  ),
  NOW()
);

-- 2. Verificar que se insertó correctamente
SELECT 
  id,
  email_type,
  recipient_email, 
  status,
  template_data,
  created_at
FROM email_notifications 
WHERE recipient_email = 'soporte@misfinanzas.com'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Obtener estadísticas actuales
SELECT * FROM get_email_stats();

-- 4. Verificar templates disponibles
SELECT 
  template_type,
  subject_template,
  is_active,
  description
FROM email_templates 
ORDER BY created_at;

-- 5. Simular que se enviaron varios emails para testing de alertas
-- (Opcional - solo si quieres probar el sistema de alertas)
/*
INSERT INTO email_notifications (
  user_id, email_type, recipient_email, status, template_data, sent_at
)
SELECT 
  gen_random_uuid(),
  'welcome_premium',
  'test-' || generate_series || '@misfinanzas.com',
  'sent',
  '{"user_name": "Test User", "amount": "15"}',
  NOW() - (random() * interval '30 days')
FROM generate_series(1, 2250); -- Simular 2250 emails para activar alerta al 75%
*/