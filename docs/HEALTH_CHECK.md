# 🏥 SISTEMA DE HEALTH CHECK AUTOMÁTICO

Este sistema valida automáticamente que todas las funcionalidades críticas del sistema sigan operativas después de realizar cambios.

## 🚀 Uso Rápido

```bash
# Opción 1: NPM Script (recomendado)
npm run test-system

# Opción 2: Node directo  
npm run health-check

# Opción 3: Validación completa (health check + build)
npm run validate
```

## ⚙️ Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example.new .env
   # Editar .env con tus credenciales de Supabase
   ```

3. **Dar permisos al script:**
   ```bash
   chmod +x scripts/run-health-check.sh
   ```

## 🧪 Tests Incluidos

### 📊 **Funciones de Base de Datos**
- ✅ `get_user_subscription_info` - Obtener info de suscripción
- ✅ `is_current_user_admin` - Verificar permisos admin
- ✅ `get_all_subscriptions_admin` - Panel de administrador
- ✅ `change_user_subscription` - **CRÍTICA** - Cambiar suscripciones

### 🗄️ **Estructura de Tablas**
- ✅ `user_subscriptions` - Tabla de suscripciones
- ✅ `categories` - Categorías de gastos
- ✅ `payment_methods` - Métodos de pago
- ✅ `income_types` - Tipos de ingresos
- ✅ `budgets` - Presupuestos
- ✅ `user_profiles` - Perfiles de usuario

### 🔐 **Autenticación**
- ✅ Gestión de sesiones
- ✅ Configuración de autenticación
- ✅ Estado de usuario actual

### 📋 **Restricciones de Suscripción**
- ✅ Límites de plan Free (3 categorías, 2 métodos pago, 2 presupuestos)
- ✅ Validación de límites disponibles
- ✅ Cálculo correcto de elementos utilizados

### ⚡ **Triggers de Base de Datos**
- ✅ Trigger de signup de usuarios
- ✅ Creación automática de suscripciones Free

### 🛡️ **Políticas RLS**
- ✅ Row Level Security habilitado
- ✅ Políticas de acceso funcionando

### 🔍 **Integridad de Datos**
- ✅ Sin suscripciones huérfanas
- ✅ Consistencia de datos

### 🌐 **Integración Frontend**
- ✅ Archivos de build existentes
- ✅ Variables de entorno configuradas

## 📊 Interpretación de Resultados

### ✅ **Sistema Saludable**
```
🎉 ¡SISTEMA SALUDABLE! Todos los tests críticos pasaron.
✨ Es seguro realizar cambios en el sistema.
```

### ❌ **Problemas Detectados**
```
🚨 SE ENCONTRARON PROBLEMAS:
   • change_user_subscription function - FAILED
   • Table: user_subscriptions - FAILED

🚨 REVISAR ANTES DE CONTINUAR
```

## 🔧 Resolución de Problemas Comunes

### **Error: Variables de entorno no configuradas**
```bash
# Solución:
cp .env.example.new .env
# Editar .env con tus credenciales reales
```

### **Error: Función change_user_subscription no existe**
```bash
# Ejecutar en Supabase SQL Editor:
# supabase/definitive_fix.sql
```

### **Error: Trigger de signup no funciona**
```bash
# Ejecutar en Supabase SQL Editor:
# supabase/fix_trigger_simple.sql
```

### **Error: Tabla no accesible**
- Verificar políticas RLS en Supabase Dashboard
- Revisar permisos de usuario actual

## 🔄 Flujo de Trabajo Recomendado

1. **Antes de hacer cambios:**
   ```bash
   npm run test-system  # Verificar estado inicial
   ```

2. **Hacer tus cambios** (código, SQL, etc.)

3. **Después de hacer cambios:**
   ```bash
   npm run validate     # Health check + Build
   ```

4. **Si falla algún test:**
   - Revisar errores específicos
   - Ejecutar scripts SQL necesarios
   - Repetir health check hasta que pase

5. **Si todo pasa:**
   ```bash
   git add . && git commit -m "cambios validados"
   git push
   ```

## 📝 Agregar Nuevos Tests

Para agregar tests adicionales, edita `scripts/system-health-check.js`:

```javascript
async testNuevaFuncionalidad() {
  console.log('\n🆕 === TESTING NUEVA FUNCIONALIDAD ===');
  
  await this.runTest('Mi nuevo test', async () => {
    // Tu lógica de test aquí
    const { data, error } = await supabase.from('mi_tabla').select('*');
    return error === null;
  });
}
```

## 🚨 Tests Críticos NO TOCAR

Estos tests validan funcionalidades que YA FUNCIONAN y NO deben modificarse:

- ❌ **NO MODIFICAR:** `change_user_subscription function`  
- ❌ **NO MODIFICAR:** `get_user_subscription_info function`
- ❌ **NO MODIFICAR:** Admin panel functions
- ❌ **NO MODIFICAR:** Subscription limits validation

## 📞 Soporte

Si un health check falla consistentemente:

1. Revisar logs detallados en la consola
2. Verificar que la base de datos esté actualizada
3. Confirmar que todas las variables de entorno están configuradas
4. Ejecutar scripts SQL de reparación en orden