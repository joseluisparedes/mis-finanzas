# CONFIGURACIÓN GMAIL SMTP - 100% GRATUITO

## Variables de Entorno Necesarias en Supabase:

1. **GMAIL_USER**: Tu dirección de Gmail (ej: jose241100@gmail.com)
2. **GMAIL_APP_PASSWORD**: Contraseña de aplicación de Gmail (NO tu contraseña normal)
3. **EMAIL_FROM_NAME**: Nombre del remitente (ej: MisFinanzas)
4. **EMAIL_BASE_URL**: https://joseluisparedes.github.io/mis-finanzas
5. **EMAIL_SUPPORT_EMAIL**: soporte@misfinanzas.com

## Cómo obtener Gmail App Password:

1. Ve a tu cuenta de Google: https://myaccount.google.com
2. Seguridad → Verificación en 2 pasos (debe estar activada)
3. Contraseñas de aplicaciones
4. Selecciona "Correo" y "Otro (nombre personalizado)" 
5. Escribe "MisFinanzas"
6. Copia la contraseña de 16 caracteres generada

## Configurar en Supabase:

1. Ve a: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/functions
2. Settings → Environment variables
3. Agrega las 5 variables arriba

## Ventajas de Gmail SMTP:

✅ Completamente GRATIS (sin límites de 3000 emails)
✅ No requiere dominio verificado
✅ No requiere tarjeta de crédito
✅ Envía a cualquier email sin restricciones
✅ Mismos templates HTML que teníamos con Resend
✅ Compatible con todo el sistema existente

## Una vez configurado:
- Ejecutar: `node real-email-test.js`
- El email debería llegar a contacto.intrusosgamers@gmail.com
- Revisar carpeta SPAM si no aparece en Bandeja de Entrada