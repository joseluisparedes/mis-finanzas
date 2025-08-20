# 📁 Archive / Archivo

Esta carpeta contiene archivos no esenciales para el funcionamiento de la aplicación, organizados para mantener el proyecto limpio.

## 📂 Estructura

### `backup-components/`
Archivos de respaldo de componentes React:
- `AppSupabase_backup.jsx` - Backup del componente principal
- `AppSupabase_clean.jsx` - Versión limpia de desarrollo
- `AppSupabase_working.jsx` - Versión de trabajo

### `config-files/`
Archivos de configuración alternativos:
- `vercel.json` - Configuración para deploy en Vercel (alternativo a GitHub Pages)

### `documentation/`
Documentación del proyecto:
- `SUPABASE_MIGRATION_COMPLETE.md` - Documentación de migración
- `SUPABASE_SETUP.md` - Instrucciones de setup
- `v2.txt` - Notas de versión

### `legacy-code/`
Código de versiones anteriores:
- `App.jsx` - Componente principal v1
- `storage.js` - Sistema de almacenamiento local anterior
- `useFinancialData.js` - Hook de datos anterior

### `sql-maintenance/`
Scripts SQL de mantenimiento y migración:
- `cleanup_duplicate_payment_methods.sql`
- `ejecutar_en_supabase.sql`
- `migration_*.sql` - Scripts de migración
- `reset-database.sql` - Script para resetear BD
- `setup-fresh-database.sql` - Script para BD nueva

### `sql-scripts/`
Scripts SQL de configuración inicial:
- `complete-supabase-setup*.sql` - Configuraciones completas
- `debug-database.sql` - Scripts de debugging
- `fix-*.sql` - Scripts de corrección

### `test-data/`
Datos de prueba:
- `datos-prueba-finanzas-315-transacciones.xlsx` - Dataset de prueba

## ⚠️ Importante

Estos archivos están archivados pero **NO eliminados** por si se necesitan en el futuro. La aplicación funciona completamente sin ellos.