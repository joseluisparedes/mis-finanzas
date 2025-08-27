# SOLUCIÓN PROBLEMA EMAIL DOMINIO

## 🚨 PROBLEMA IDENTIFICADO:
```
Error 403: The misfinanzas.com domain is not verified
```

## 🛠️ SOLUCIÓN RÁPIDA:

### Ve a Supabase Dashboard → Functions → Environment Variables:
https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/functions

### Cambia estas variables:

**ANTES (no funciona):**
```
RESEND_FROM_EMAIL=no-reply@misfinanzas.com
```

**DESPUÉS (funciona inmediatamente):**
```
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=MisFinanzas
```

## ✅ ALTERNATIVAS QUE FUNCIONAN:

### Opción 1: Dominio de Resend (RECOMENDADA)
```
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=MisFinanzas
```

### Opción 2: Tu email personal verificado
```
RESEND_FROM_EMAIL=tu-email@gmail.com
RESEND_FROM_NAME=MisFinanzas
```

### Opción 3: Verificar misfinanzas.com (más trabajo)
1. Ve a: https://resend.com/domains
2. Add Domain: misfinanzas.com
3. Configura DNS records
4. Espera verificación

## 🚀 DESPUÉS DE CAMBIAR:

### Reenviar el email manualmente:
```sql
-- En SQL Editor, actualizar el email fallido:
UPDATE email_notifications 
SET status = 'pending', 
    error_message = NULL,
    failed_at = NULL,
    updated_at = NOW()
WHERE id = '43a12aeb-e57d-49b2-a799-828472e215d7';
```

### O crear nuevo intento:
```sql
INSERT INTO email_notifications (
  user_id,
  email_type,
  recipient_email,
  status,
  template_data
) VALUES (
  'ad733270-4009-48d1-a276-1085e358b465',
  'welcome_premium', 
  'contacto.intrusosgamers@gmail.com',
  'pending',
  '{"user_name": "contacto intrusos", "amount": "5", "plan_name": "Premium Early Bird"}'
);
```

## 📧 TEST INMEDIATO:

Después de cambiar la variable, ejecuta:
```bash
curl -X POST \
  "https://aimfmouxduklejrejlcq.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome_premium",
    "recipient_email": "contacto.intrusosgamers@gmail.com",
    "template_data": {"user_name": "contacto intrusos", "amount": "5"}
  }'
```