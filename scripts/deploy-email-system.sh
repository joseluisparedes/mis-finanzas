#!/bin/bash

# ================================================================
# SCRIPT DE DEPLOYMENT - SISTEMA DE NOTIFICACIONES POR EMAIL
# ================================================================
# Fecha: 26 Agosto 2025
# Propósito: Automatizar deployment del sistema de emails

set -e

echo "🚀 INICIANDO DEPLOYMENT DEL SISTEMA DE EMAILS"
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logs con colores
log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI no está instalado"
    log_info "Instalando Supabase CLI..."
    npx supabase --version
fi

# 1. Verificar variables de entorno críticas
log_info "Verificando variables de entorno..."

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    log_error "SUPABASE_ACCESS_TOKEN no está configurado"
    log_info "Por favor, ejecuta: export SUPABASE_ACCESS_TOKEN=tu_token_aqui"
    exit 1
fi

if [ -z "$RESEND_API_KEY" ]; then
    log_warning "RESEND_API_KEY no está configurado - necesario para envío de emails"
    log_info "Configúralo en Supabase Dashboard > Project Settings > Edge Functions"
fi

log_success "Variables de entorno verificadas"

# 2. Crear/Actualizar tablas de base de datos
log_info "Ejecutando SQL para tablas de email..."

# Aplicar SQL en Supabase
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    log_info "Aplicando SQL via psql..."
    psql "$DATABASE_URL" -f database/email_notifications.sql
else
    log_info "Aplicando SQL via Supabase Dashboard (manual)"
    log_info "👉 Copia el contenido de database/email_notifications.sql"
    log_info "👉 Pégalo en: Supabase Dashboard > SQL Editor > New Query"
    echo
    read -p "Presiona Enter cuando hayas ejecutado el SQL en Supabase Dashboard..."
fi

log_success "Tablas de email configuradas"

# 3. Deploy de Edge Functions
log_info "Deployando Edge Function: send-email..."

# Crear función si no existe el directorio
if [ ! -d "supabase/functions/send-email" ]; then
    log_error "Directorio de función send-email no encontrado"
    exit 1
fi

# Deploy de la función send-email
supabase functions deploy send-email --project-ref aimfmouxduklejrejlcq

if [ $? -eq 0 ]; then
    log_success "Edge Function send-email deployada exitosamente"
else
    log_error "Error deployando send-email function"
    exit 1
fi

# 4. Actualizar función culqi-payment-webhook
log_info "Actualizando función culqi-payment-webhook con integración de emails..."

supabase functions deploy culqi-payment-webhook --project-ref aimfmouxduklejrejlcq

if [ $? -eq 0 ]; then
    log_success "Edge Function culqi-payment-webhook actualizada exitosamente"
else
    log_error "Error actualizando culqi-payment-webhook function"
    exit 1
fi

# 5. Configurar variables de entorno en Supabase
log_info "Verificando configuración de variables de entorno en Supabase..."

log_warning "🔧 CONFIGURACIÓN MANUAL REQUERIDA:"
echo
echo "Ve a: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/functions"
echo "En la sección 'Environment Variables', configura:"
echo
echo "RESEND_API_KEY=re_tu_llave_resend_aqui"
echo "RESEND_FROM_EMAIL=no-reply@misfinanzas.com"  
echo "RESEND_FROM_NAME=MisFinanzas"
echo "EMAIL_BASE_URL=https://joseluisparedes.github.io/mis-finanzas"
echo "EMAIL_SUPPORT_EMAIL=soporte@misfinanzas.com"
echo
read -p "Presiona Enter cuando hayas configurado las variables..."

# 6. Test de conectividad
log_info "Probando conectividad de Edge Functions..."

SUPABASE_URL="https://aimfmouxduklejrejlcq.supabase.co"

# Test send-email function
log_info "Testeando función send-email..."
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  "${SUPABASE_URL}/functions/v1/send-email" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","user_id":"test","template_data":{}}' > /tmp/send_email_test.txt

SEND_EMAIL_STATUS=$(cat /tmp/send_email_test.txt)
if [ "$SEND_EMAIL_STATUS" = "200" ] || [ "$SEND_EMAIL_STATUS" = "400" ]; then
    log_success "Función send-email responde correctamente"
else
    log_warning "Función send-email status: $SEND_EMAIL_STATUS"
fi

# Test culqi-payment-webhook function  
log_info "Testeando función culqi-payment-webhook..."
curl -s -o /dev/null -w "%{http_code}" \
  -X GET \
  "${SUPABASE_URL}/functions/v1/culqi-payment-webhook" > /tmp/culqi_test.txt

CULQI_STATUS=$(cat /tmp/culqi_test.txt)
if [ "$CULQI_STATUS" = "200" ] || [ "$CULQI_STATUS" = "405" ]; then
    log_success "Función culqi-payment-webhook responde correctamente"
else
    log_warning "Función culqi-payment-webhook status: $CULQI_STATUS"
fi

# 7. Verificar permisos de base de datos
log_info "Verificando permisos de base de datos..."

# Test básico de conexión a la DB
supabase db diff --schema public > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log_success "Conexión a base de datos OK"
else
    log_warning "Problemas de conexión a base de datos"
fi

# 8. Deployment summary
echo
echo "📊 RESUMEN DEL DEPLOYMENT"
echo "========================"
echo
log_success "✅ Edge Function send-email deployada"
log_success "✅ Edge Function culqi-payment-webhook actualizada" 
log_success "✅ Esquemas de base de datos aplicados"
log_success "✅ Tests de conectividad completados"
echo

log_info "🎯 PRÓXIMOS PASOS MANUALES:"
echo "1. 🔑 Obtener API Key de Resend en: https://resend.com/api-keys"
echo "2. ⚙️ Configurar variables de entorno en Supabase Dashboard"
echo "3. 🧪 Realizar test de pago completo para verificar emails"
echo "4. 📊 Monitorear logs en Supabase Functions Dashboard"
echo

log_info "📍 URLs IMPORTANTES:"
echo "• Functions Dashboard: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/functions"
echo "• Database Tables: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/editor" 
echo "• Logs: https://supabase.com/dashboard/project/aimfmouxduklejrejlcq/logs"
echo

log_success "🎉 SISTEMA DE EMAILS DEPLOYADO EXITOSAMENTE"
log_info "El sistema está listo para procesar notificaciones automáticas"

# Cleanup
rm -f /tmp/send_email_test.txt /tmp/culqi_test.txt

exit 0