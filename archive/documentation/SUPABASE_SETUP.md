# 🚀 Configuración de Supabase

## 📋 Pasos para configurar Supabase

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva cuenta o inicia sesión
3. Crear nuevo proyecto:
   - **Nombre**: `mis-finanzas-app`
   - **Base de datos**: generar contraseña segura
   - **Región**: seleccionar la más cercana

### 2. Obtener credenciales
1. En el dashboard de tu proyecto, ve a **Settings > API**
2. Copiar:
   - **Project URL** (será algo como: `https://xxx.supabase.co`)
   - **anon public key** (clave pública para el cliente)

### 3. Configurar variables de entorno
Editar el archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-aqui
```

### 4. Ejecutar schema SQL
1. En Supabase dashboard, ve a **SQL Editor**
2. Ejecutar el contenido del archivo `supabase/schema.sql`
3. Verificar que se crearon las tablas correctamente

### 5. Configurar autenticación
1. Ve a **Authentication > Settings**
2. Configurar proveedores de auth (Email por defecto está bien)
3. Opcional: configurar OAuth (Google, GitHub, etc.)

### 6. Configurar Storage (opcional)
Si quieres almacenar archivos de backup:
1. Ve a **Storage**
2. Crear bucket llamado `user-backups`
3. Configurar políticas de acceso

## ✅ Verificación

Después de la configuración:

```bash
npm run dev
```

- ✅ La app debe conectar con Supabase
- ✅ Debe permitir registro de usuarios
- ✅ Los datos deben persistir en la BD

## 🔧 Troubleshooting

### Error de conexión
- Verificar que las variables de entorno estén bien configuradas
- Verificar que el proyecto de Supabase esté activo

### Error de RLS (Row Level Security)
- Verificar que las políticas se ejecutaron correctamente
- Verificar que el usuario esté autenticado

### Error de schema
- Ejecutar nuevamente el archivo `schema.sql`
- Verificar que no hay conflictos con datos existentes

## 📊 Plan gratuito de Supabase

El plan gratuito incluye:
- **Base de datos**: 500MB de almacenamiento
- **Autenticación**: 50,000 usuarios activos mensuales
- **API**: 500MB de transferencia
- **Storage**: 1GB de archivos
- **Edge Functions**: 500,000 invocaciones

Esto es más que suficiente para uso personal y pruebas.

## 🔄 Migración de datos

Una vez configurado Supabase, la app detectará automáticamente datos en LocalStorage y ofrecerá migrarlos a la BD en la nube.

## 🚀 Próximos pasos

1. ✅ Configurar Supabase (este paso)
2. 🔄 Implementar servicios de autenticación
3. 🔄 Crear API service para CRUD operations
4. 🔄 Modificar useFinancialData hook
5. 🔄 Implementar UI de autenticación
6. 🔄 Testing y deploy