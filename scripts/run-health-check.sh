#!/bin/bash

# Script para ejecutar el health check del sistema
# Uso: ./scripts/run-health-check.sh

echo "🏥 INICIANDO HEALTH CHECK DEL SISTEMA MIS FINANZAS"
echo "=================================================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js no está instalado"
    echo "Instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ ERROR: Archivo .env no encontrado"
    echo "Crea un archivo .env con las variables de Supabase:"
    echo "VITE_SUPABASE_URL=tu_url_de_supabase"
    echo "VITE_SUPABASE_ANON_KEY=tu_key_anonima"
    exit 1
fi

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Ejecutar health check
echo "🚀 Ejecutando tests de sistema..."
node --experimental-modules scripts/system-health-check.js

# Capturar el código de salida
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "🎉 ¡SISTEMA VERIFICADO EXITOSAMENTE!"
    echo "✅ Todas las funcionalidades críticas están operativas"
    echo "✨ Es seguro continuar con cambios en el sistema"
else
    echo ""
    echo "🚨 SE DETECTARON PROBLEMAS EN EL SISTEMA"
    echo "❌ Revisa los errores antes de continuar"
    echo "💡 Ejecuta los scripts SQL necesarios para corregir"
fi

exit $exit_code