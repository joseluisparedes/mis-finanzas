# MisFinanzas - Control Financiero Personal 💰

La aplicación financiera más completa del Perú. Gestiona tu dinero de forma inteligente y segura.

## 📁 Estructura del Proyecto

```
/src/
├── components/
│   ├── auth/           # Componentes de autenticación
│   ├── dashboard/      # Dashboard y paneles administrativos
│   ├── common/         # Componentes reutilizables
│   ├── features/       # Funcionalidades específicas
│   ├── migration/      # Migración de datos
│   ├── pwa/           # Progressive Web App
│   ├── landing/       # Landing page
│   └── user/          # Gestión de usuarios
├── hooks/             # Custom React hooks
├── services/          # Servicios de negocio
├── lib/              # Librerías y configuración
└── main.jsx          # Punto de entrada

/database/             # Scripts SQL y base de datos
/docs/                # Documentación
/assets/              # Recursos estáticos
/public/              # Assets públicos
/scripts/             # Scripts de utilidad
/archive/             # Código legacy
```

## 🚀 Comandos

```bash
npm install          # Instalar dependencias
npm run dev         # Desarrollo local
npm run build       # Build para producción  
npm run preview     # Preview del build
```

## 📚 Documentación

- [Health Check](docs/HEALTH_CHECK.md)
- [Restricciones Implementadas](docs/RESTRICCIONES_IMPLEMENTADAS.md) 
- [Contexto Claude Code](docs/CLAUDE_CODE_CONTEXT.txt)

## 💾 Base de Datos

Todos los scripts SQL están organizados en `/database/`:
- Scripts de setup y migración
- Funciones de Supabase
- Consultas administrativas

## ✨ Funcionalidades

- 🔐 Autenticación con Supabase
- 📊 Dashboard financiero completo
- 📱 Progressive Web App (PWA)
- 🌙 Modo oscuro
- 📈 Reportes y gráficos
- 💳 Multi-moneda (PEN/USD)
- ☁️  Sincronización en la nube

## 🛡️ Seguridad

- Encriptación nivel bancario
- Validación de datos robusta
- Rate limiting implementado
- Sanitización de inputs

---

Hecho con ❤️ en Perú 🇵🇪