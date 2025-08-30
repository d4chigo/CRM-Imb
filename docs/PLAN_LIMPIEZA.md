# Plan de Limpieza de Archivos y Dependencias

Este commit es un snapshot ANTES de eliminar o refactorizar los elementos listados. Sirve como punto seguro de regreso.

## Archivos / Carpetas candidatos a eliminar

1. `app/` (Electron wrapper)  
   - Relacionado con empaquetar como app de escritorio. Si no se usa distribución Electron, se eliminará.
2. `package.json` en la RAÍZ (solo lanza Electron)  
   - Se elimina si abandonamos Electron. Mantendremos únicamente `client/` y `server/`.
3. `server/test-login.js`  
   - Script de prueba manual ya obsoleto.
4. `server/scripts/responses.js`  
   - No se usa y su implementación de `res.send` es incorrecta.
5. `server/scripts/checkDatabase.js`  
   - Solo para diagnóstico puntual. Se puede archivar (`/docs/scripts-legacy/`) o eliminar.
6. `server/scripts/migrate_20250830_add_contact_fields.sql`  
   - Consolidar cambios en el esquema principal y luego eliminar (o mover a carpeta de migraciones formales).
7. `server/pnpm-workspace.yaml`  
   - Aparentemente innecesario dentro de `server/`. Si se requiere monorepo debe estar en raíz.
8. `package-lock.json` (raíz)  
   - Usamos PNPM (`pnpm-lock.yaml`). Este lock de npm sobra.
9. Carpeta build `client/.next/`  
   - No debe versionarse. Asegurar que esté ignorada en `.gitignore`.
10. Duplicidad hook `use-mobile`  
    - Verificar si existen implementaciones duplicadas en `client/hooks/` y `client/components/ui/`; unificar en un solo archivo.

## Archivos SQL a consolidar
- `database/crm_schema.sql`
- `server/scripts/setup-database.sql`

Mantener solo una fuente de verdad del esquema. Se recomienda conservar `database/crm_schema.sql` y eliminar/absorber el otro.

## Dependencias a depurar (server/package.json)
- Eliminar `bcrypt` (no se usa) y quedarse con `bcryptjs`.
- Eliminar `@types/bcryptjs` (innecesario en proyecto JS).

## Pasos posteriores (siguientes commits después de este snapshot)
1. Eliminar archivos/carpetas listados (o mover a `docs/legacy/`).
2. Limpiar dependencias y reinstalar: `pnpm install` en `server/`.
3. Actualizar `.gitignore` para asegurar exclusión de `.next/` y artefactos.
4. Unificar hook `use-mobile`.
5. Actualizar README indicando estructura final.

## Notas
- Este commit facilita revertir si algo de lo listado resulta necesario.
- Cambios funcionales NO se aplican aquí, solo documentación previa a la limpieza.

---
Fecha: 2025-08-30
