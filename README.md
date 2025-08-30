# CRM Inmobiliario - Sistema de Gestión

Sistema CRM completo para gestión inmobiliaria con autenticación JWT y interfaz moderna.

## 🚀 Configuración de Desarrollo

### Prerrequisitos
- Node.js 18+
- pnpm
- MySQL (XAMPP recomendado)
- Git

### Puertos del Sistema
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000  
- **Base de Datos**: Puerto 3306 (MySQL)

## 🛠️ Instalación

### 1. Clonar Repositorio
```bash
git clone [url-repositorio]
cd CRM-Imb
```

### 2. Configurar Base de Datos
- Iniciar MySQL
- Crear base de datos `crm_imb` (o usar el script `database/crm_schema.sql`)

```sql
CREATE DATABASE crm_imb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

Ejecutar el esquema (opcional si ya existe):
```bash
mysql -u root -p crm_imb < database/crm_schema.sql
```

### 3. Configurar Backend
```bash
cd server
pnpm install
```

Crear archivo `.env` en `server/` con:
```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=crm_imb
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro
FRONTEND_URL=http://localhost:3000
```

### 4. Configurar Frontend
```bash
cd ../client
pnpm install
```

Crear archivo `.env.local` en `client/` con:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=CRM Inmobiliario
```

## 🏃‍♂️ Ejecutar en Desarrollo

### Iniciar Backend
```bash
cd server
pnpm dev
```

### Iniciar Frontend  
```bash
cd client
pnpm dev
```

## 🔍 Scripts Útiles

Desde `server/`:
```bash
node scripts/checkDatabase.js   # Verifica conexión, tablas y usuarios
pnpm run create-admin           # Crea usuario administrador inicial
```

## 👤 Usuario Administrador por Defecto

Si ejecutaste `create-admin`:

**Email**: admin@crm-inmobiliario.com  
**Contraseña**: Admin123!

⚠️ Cambiar la contraseña después del primer login.

## 🔒 Características de Seguridad

- Autenticación JWT con refresh tokens
- Hashing de contraseñas con bcrypt
- Rate limiting para prevenir ataques
- Headers de seguridad con Helmet
- Configuración CORS restringida
- Validación de entrada con express-validator

## 📁 Estructura del Proyecto

```
CRM-Imb/
├── client/           # Frontend Next.js
│   ├── app/         # Rutas de la aplicación
│   ├── components/  # Componentes reutilizables
│   ├── contexts/    # Contextos de React
│   └── lib/         # Utilidades y configuración
├── server/          # Backend Express.js
│   ├── config/      # Configuración de BD y app
│   ├── controllers/ # Controladores de rutas
│   ├── middleware/  # Middleware de seguridad
│   ├── routes/      # Definición de rutas
│   ├── services/    # Lógica de negocio
│   └── scripts/     # Scripts de utilidad
└── docs/           # Documentación
```

## 🚧 Estado del Desarrollo

- ✅ Autenticación JWT completa
- ✅ Base de datos configurada
- ✅ Interfaz de login/registro
- ✅ Dashboard protegido
- ✅ Configuración de puertos optimizada
- 🔄 Gestión de contactos (en desarrollo)
- 🔄 Gestión de propiedades (en desarrollo)
- 🔄 Pipeline de ventas (en desarrollo)

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: descripción en español'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---
**Desarrollado para gestión inmobiliaria profesional** 🏠
