-- ================================================================
-- SISTEMA DE NOTIFICACIONES POR EMAIL
-- ================================================================
-- Fecha: 26 Agosto 2025
-- Propósito: Tracking y configuración de emails automáticos

-- Tabla principal para tracking de emails enviados
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'welcome_premium',
    'payment_failed', 
    'payment_retry',
    'renewal_reminder',
    'plan_downgrade',
    'new_features',
    'inactivity_reminder'
  )),
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed', 
    'bounced',
    'spam',
    'delivered',
    'opened',
    'clicked'
  )),
  template_data JSONB DEFAULT '{}', -- Datos variables para el template
  
  -- Timestamps de seguimiento
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Información del proveedor de email
  resend_message_id TEXT, -- ID del proveedor de email (Resend)
  error_message TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de configuración de templates de email
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT UNIQUE NOT NULL,
  subject_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Configuración del remitente
  sender_name TEXT DEFAULT 'MisFinanzas',
  sender_email TEXT DEFAULT 'no-reply@misfinanzas.com',
  
  -- Configuración de reenvío automático
  auto_retry BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  retry_interval_hours INTEGER DEFAULT 24,
  
  -- Metadatos
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id 
ON email_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_email_notifications_email_type 
ON email_notifications(email_type);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status 
ON email_notifications(status);

CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at 
ON email_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_notifications_user_type 
ON email_notifications(user_id, email_type);

-- Políticas RLS para seguridad
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "Users can view own email notifications" ON email_notifications
FOR SELECT USING (auth.uid() = user_id);

-- Solo admins pueden ver todas las notificaciones
CREATE POLICY "Admins can view all email notifications" ON email_notifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND subscription_type = 'admin'
  )
);

-- Solo funciones del servidor pueden insertar/actualizar notificaciones
CREATE POLICY "Service role can manage email notifications" ON email_notifications
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Solo admins pueden gestionar templates
CREATE POLICY "Admins can manage email templates" ON email_templates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = auth.uid() 
    AND subscription_type = 'admin'
  )
);

-- Función para actualizar timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_email_notifications_updated_at 
BEFORE UPDATE ON email_notifications 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
BEFORE UPDATE ON email_templates 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar templates por defecto
INSERT INTO email_templates (
  template_type, 
  subject_template, 
  description,
  is_active
) VALUES 
(
  'welcome_premium',
  '🎉 ¡Bienvenido a MisFinanzas Premium! Todas las funciones desbloqueadas',
  'Email de bienvenida cuando un usuario se suscribe a Premium',
  true
),
(
  'payment_failed',
  '⚠️ Problema con tu pago en MisFinanzas - Acción requerida',
  'Notificación cuando falla el procesamiento de un pago',
  true
),
(
  'payment_retry',
  '🔄 Recordatorio: Actualiza tu método de pago en MisFinanzas', 
  'Recordatorio para actualizar método de pago después de fallos',
  true
),
(
  'renewal_reminder',
  '📅 Tu suscripción Premium se renueva en 7 días',
  'Recordatorio antes de renovación automática',
  true
)
ON CONFLICT (template_type) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Función para obtener estadísticas de emails
CREATE OR REPLACE FUNCTION get_email_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '30 days'),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  email_type TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    en.email_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE en.status = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE en.opened_at IS NOT NULL) as total_opened,
    COUNT(*) FILTER (WHERE en.clicked_at IS NOT NULL) as total_clicked,
    COUNT(*) FILTER (WHERE en.status = 'failed') as total_failed,
    ROUND(
      (COUNT(*) FILTER (WHERE en.status = 'delivered')::NUMERIC / 
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as delivery_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE en.opened_at IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE en.status = 'delivered'), 0)) * 100, 2
    ) as open_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE en.clicked_at IS NOT NULL)::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE en.opened_at IS NOT NULL), 0)) * 100, 2
    ) as click_rate
  FROM email_notifications en
  WHERE en.created_at >= start_date 
    AND en.created_at <= end_date
    AND en.status != 'pending'
  GROUP BY en.email_type
  ORDER BY total_sent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE email_notifications IS 'Tracking de todos los emails enviados por el sistema';
COMMENT ON TABLE email_templates IS 'Configuración de templates de email';
COMMENT ON FUNCTION get_email_stats IS 'Obtiene estadísticas de rendimiento de emails por tipo';

-- Grants para funciones del servidor
GRANT ALL ON email_notifications TO service_role;
GRANT ALL ON email_templates TO service_role;
GRANT EXECUTE ON FUNCTION get_email_stats TO service_role;