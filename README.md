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

### 3. Variables de Entorno (ahora en la RAÍZ)

Instalar dependencias backend:
```bash
cd server
pnpm install
```

Copiar `.env.example` de la raíz a `.env` (también en la raíz):
```bash
cp .env.example .env   # Windows PowerShell: copy .env.example .env
```
Edita los secrets y credenciales. El backend leerá primero `./.env`.

### 4. Configurar Frontend
```bash
cd ../client
pnpm install
```

Opcional: si quieres sobre-escribir variables sólo para el frontend, crea `client/.env.local`.
Si no, el código usa las variables compiladas existentes (NEXT_PUBLIC_...).

Variables mínimas para frontend (si decides crear `.env.local`):
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
- ✅ Gestión de contactos con mejoras recientes
- ✅ Pipeline de ventas
- ✅ Cotizaciones
- ✅ Importación de contactos de Google

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: descripción en español'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---
**Desarrollado para gestión inmobiliaria profesional** 🏠

## ☁️ Importación de Contactos de Google

1. Crea credenciales OAuth (tipo Aplicación Web) en Google Cloud.
2. Añade URI de redirección: `http://localhost:4000/api/google/contacts/callback`.
3. Copia CLIENT_ID y CLIENT_SECRET a `.env` (raíz):
```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/contacts/callback
```
4. Reinicia backend y frontend.
5. En la vista Contactos pulsa "Importar Google". Se abrirá popup, autoriza y se cerrará con un toast del resultado.

Deduplicación: se omiten contactos cuyo email o teléfono ya existan.

## ✨ Novedades recientes (CRM)

- **Listado de Clientes mejorado** (`client/components/contacts-simple.tsx`):
  - Filtros por `Etiqueta` y `Etapa de pipeline` visibles solo en vista de clientes (`onlyClients`).
  - Filtros aplican automáticamente sin botón y consideran todas las páginas (se hace carga completa cuando hay filtros activos).
  - Render de múltiples etiquetas por cliente (incluye `etiquetas`, legado `etiqueta` y `etiqueta_otro`).
  - Botón directo de **WhatsApp** por cliente (si hay teléfono).
  - Acción “**Enviar a pipeline**” por cliente, creando oportunidad base.
  - Paginación abajo, con página activa resaltada.
  - Guardado robusto al editar, incluyendo saneo de `fecha_nacimiento` y evitar cadenas vacías.

- **Listado general de Contactos** (`client/components/contacts-list.tsx`):
  - Menú de acciones compacto y consistente (fondo blanco, texto oscuro).
  - Diálogo de **duplicados** con acción “Fusionar grupo”.
  - Barra inferior para acciones masivas (Etiquetar, Pipeline, Eliminar).
  - Widget de **Importación Google** destacado e integrado.

- **Importación Google** (`client/components/GoogleImportWidget.tsx`):
  - Manejo de popup y fallbacks (localStorage) más robusto.
  - Handler `retrySync()` corregido para reintentos.

- **Historial de Cotizaciones** (`client/components/quotes/QuotesHistory.tsx`):
  - Manejo de **token expirado (401)**: muestra mensaje, limpia token y redirige a `/login` automáticamente.

## 🧭 Uso rápido de las nuevas funciones

- En “Clientes”, usa los selectores de **Etiqueta** y **Etapa** para filtrar; no necesitas “Actualizar”.
- En cada tarjeta de cliente:
  - Ícono de **WhatsApp** abre `wa.me` con el número del contacto.
  - Menú “Enviar a pipeline” crea la oportunidad y marca el contacto como cliente.
- En “Contactos”, abre “Duplicados” y utiliza “Fusionar grupo” para limpiar registros.
- En “Cotizaciones → Historial”, si tu sesión expira verás aviso y serás redirigido a iniciar sesión.

## 🔧 Notas técnicas

- El backend puede devolver `etiquetas_json`; el frontend normaliza a `etiquetas` al cargar.
- El filtrado por etapa cruza contra oportunidades a través de `contactoId` y `etapaId`.
- Para Google OAuth, asegúrate de configurar las variables y añadir el usuario de prueba en la pantalla de consentimiento.
