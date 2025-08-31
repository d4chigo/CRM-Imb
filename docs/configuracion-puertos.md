# Configuración de Puertos CRM Inmobiliario

## Puertos Asignados

- **Frontend (Cliente Next.js)**: Puerto 3000
  - URL: http://localhost:3000
  - Configuración en: `client/.env.local`

- **Backend (Servidor Express)**: Puerto 4000  
  - URL: http://localhost:4000
  - Configuración en: `server/.env`

## Configuración Requerida

### Backend (server/.env)
```
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Frontend (client/.env.local)  
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Changelog

### [2025-08-29] - Configuración de Puertos
- Cambiado puerto del backend de 3001 a 4000
- Cambiado configuración del frontend para apuntar al puerto 4000
- Frontend mantiene puerto por defecto 3000
- Actualizada documentación de configuración
