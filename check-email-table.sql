-- Verificar esquema de tabla email_notifications
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'email_notifications'
ORDER BY ordinal_position;