# Plan de Notificaciones por Correo Electrónico
**Fecha:** 26 Agosto 2025
**Sistema:** MisFinanzas - Gestión Financiera Personal

## Resumen Ejecutivo
Sistema de notificaciones automatizadas por email para mejorar la experiencia del usuario y comunicación efectiva sobre estados críticos del sistema de pagos y suscripciones.

## Casos de Uso Principales

### 1. 🎉 Notificación de Registro Premium Exitoso
**Trigger:** Usuario completa pago y se convierte en Premium
**Timing:** Inmediatamente después de confirmación de pago exitoso
**Template:** `welcome-premium.html`

**Contenido:**
- Bienvenida personalizada al plan Premium
- Resumen de características desbloqueadas
- Enlaces directos a funciones premium principales
- Tips de uso inicial para maximizar valor
- Información de soporte prioritario

### 2. ⚠️ Notificación de Fallo en Cobro de Tarjeta
**Trigger:** Error en procesamiento de pago (fondos insuficientes, tarjeta vencida, etc.)
**Timing:** Inmediatamente después del error + recordatorios (24h, 72h)
**Template:** `payment-failed.html`

**Contenido:**
- Descripción clara del problema
- Instrucciones paso a paso para solucionarlo
- Enlaces directos para actualizar método de pago
- Fecha límite antes de suspensión del servicio
- Opciones de contacto para soporte

### 3. 📊 Notificaciones Adicionales (Recomendadas)
- **Renovación próxima:** 7 días antes del vencimiento
- **Límites Free alcanzados:** Cuando user toca límites del plan gratuito
- **Nuevas funcionalidades:** Updates de producto para usuarios premium
- **Inactividad:** Re-engagement después de 30 días sin uso

## Arquitectura Técnica

### Stack de Tecnologías
- **Email Service:** Resend (moderno, confiable, API limpia)
- **Templates:** React Email + Tailwind CSS (consistencia visual)
- **Queue/Delivery:** Supabase Edge Functions
- **Storage:** Supabase Database (tracking de envíos)

### Estructura de Implementación

```
/supabase/functions/
├── send-email/                    # Edge Function principal
│   ├── index.ts                  # Handler de emails
│   ├── templates/                # Templates HTML/React
│   │   ├── welcome-premium.tsx   # Bienvenida premium  
│   │   ├── payment-failed.tsx    # Fallo de pago
│   │   └── base-layout.tsx       # Layout común
│   ├── services/
│   │   ├── resend.ts            # Cliente Resend API
│   │   ├── template-engine.ts   # Renderizado de templates
│   │   └── email-tracking.ts    # Logging y tracking
│   └── types.ts                 # Tipos TypeScript

/database/sql/
├── email_notifications.sql      # Tabla para tracking
├── email_templates.sql          # Configuración templates
└── triggers/
    ├── user_premium_trigger.sql  # Auto-envío bienvenida
    └── payment_failed_trigger.sql # Auto-envío fallos
```

### Database Schema

```sql
-- Tabla de tracking de emails
CREATE TABLE email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email_type TEXT NOT NULL, -- 'welcome_premium', 'payment_failed', etc.
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  template_data JSONB, -- Datos variables para el template
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  resend_message_id TEXT, -- ID del proveedor de email
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de configuración de templates
CREATE TABLE email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT UNIQUE NOT NULL,
  subject_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sender_name TEXT DEFAULT 'MisFinanzas',
  sender_email TEXT DEFAULT 'no-reply@misfinanzas.com',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Integración con Sistema de Pagos Existente

### 1. Modificar Edge Function de Culqi
Actualizar `/supabase/functions/culqi-payment-webhook/index.ts`:

```typescript
// Después de pago exitoso
if (chargeResponse.outcome.type === 'venta_exitosa') {
  // ... actualizar suscripción existente ...
  
  // NUEVO: Enviar email de bienvenida premium
  await supabase.functions.invoke('send-email', {
    body: {
      type: 'welcome_premium',
      user_id: paymentData.user_id,
      template_data: {
        user_name: customer.first_name + ' ' + customer.last_name,
        plan_name: paymentData.plan_name,
        amount: paymentData.amount,
        premium_features: [
          'Transacciones ilimitadas',
          'Multi-moneda PEN/USD', 
          'Exportar Excel',
          'Análisis avanzados'
        ]
      }
    }
  })
}

// Para errores de pago
if (chargeResponse.outcome.type === 'denegada') {
  await supabase.functions.invoke('send-email', {
    body: {
      type: 'payment_failed',
      user_id: paymentData.user_id,
      template_data: {
        user_name: customer.first_name + ' ' + customer.last_name,
        error_reason: chargeResponse.outcome.merchant_message,
        amount: paymentData.amount,
        retry_url: 'https://joseluisparedes.github.io/mis-finanzas/#planes'
      }
    }
  })
}
```

### 2. Variables de Entorno Requeridas

```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=no-reply@misfinanzas.com
RESEND_FROM_NAME=MisFinanzas

# Email Configuration
EMAIL_BASE_URL=https://joseluisparedes.github.io/mis-finanzas
EMAIL_SUPPORT_EMAIL=soporte@misfinanzas.com
EMAIL_SUPPORT_PHONE=+51-XXX-XXX-XXX
```

## Templates de Email Diseñados

### Template 1: Bienvenida Premium
**Asunto:** "🎉 ¡Bienvenido a MisFinanzas Premium! Todas las funciones desbloqueadas"

- Header con branding MisFinanzas
- Mensaje personalizado de bienvenida
- Grid de características premium desbloqueadas
- CTAs para acciones principales (Ver Gastos, Crear Presupuesto)
- Footer con información de soporte

### Template 2: Fallo de Pago
**Asunto:** "⚠️ Problema con tu pago en MisFinanzas - Acción requerida"

- Mensaje empático pero urgente
- Explicación clara del problema
- Pasos específicos para solucionarlo
- Botón prominente "Actualizar Método de Pago"
- Timeline antes de suspensión del servicio
- Opciones de contacto directo

## Plan de Implementación

### Fase 1: Configuración Base (1-2 horas)
- ✅ Crear Edge Function `send-email`
- ✅ Configurar integración con Resend
- ✅ Crear schemas de base de datos
- ✅ Implementar templates básicos

### Fase 2: Templates Premium (1 hora)
- ✅ Diseñar template welcome-premium
- ✅ Diseñar template payment-failed
- ✅ Testing de renderizado y envío

### Fase 3: Integración Sistema Pagos (30 min)
- ✅ Modificar webhook de Culqi
- ✅ Agregar triggers en flujos de pago
- ✅ Testing end-to-end

### Fase 4: Monitoreo y Optimización (30 min)
- ✅ Dashboard de métricas de email
- ✅ A/B testing de subject lines
- ✅ Análisis de open/click rates

## Métricas de Éxito

### KPIs Principales
- **Delivery Rate:** >98% (emails enviados exitosamente)
- **Open Rate:** >25% (emails abiertos por usuario)
- **Click Rate:** >15% (CTAs clickeados)
- **Conversion Rate:** >5% (acciones completadas post-email)

### Tracking Implementation
- Pixel de apertura en templates
- UTM parameters en todos los enlaces
- Eventos personalizados en Google Analytics
- Dashboard en Supabase para métricas

## Presupuesto Estimado

### Costos Mensuales
- **Resend API:** $20/mes (10,000 emails incluidos)
- **Desarrollo inicial:** 4 horas (una vez)
- **Mantenimiento:** 30 min/mes

### ROI Esperado
- Reducción de churn por problemas de pago: -20%
- Aumento de engagement premium: +15%
- Mejora en satisfacción del cliente: +30%

## Próximos Pasos Inmediatos

1. **Configurar cuenta Resend** - Obtener API keys
2. **Implementar Edge Function** - Crear servicio de emails
3. **Diseñar templates** - UI/UX atractivos y efectivos
4. **Integrar con Culqi webhook** - Automación completa
5. **Testing exhaustivo** - Casos reales y edge cases
6. **Deploy y monitoreo** - Lanzamiento gradual

## Conclusión

Este sistema de notificaciones por email mejorará significativamente la experiencia del usuario, reducirá problemas de comunicación y aumentará la retención de usuarios premium. La implementación es directa y escalable, con tecnologías modernas y costos controlados.

**Recomendación:** Implementar en orden de prioridad las notificaciones de pago exitoso y fallo de cobro como casos críticos para el negocio.