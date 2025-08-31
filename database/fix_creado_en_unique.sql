-- Script para corregir la restricción UNIQUE en creado_en de la tabla contactos
-- Esta restricción está causando errores durante la importación masiva de contactos

USE `crm_imb`;

-- Verificar la estructura actual de la tabla
DESCRIBE contactos;

-- Remover la restricción UNIQUE del campo creado_en
ALTER TABLE contactos DROP INDEX creado_en;

-- Verificar que se removió correctamente
DESCRIBE contactos;

-- Mostrar las restricciones restantes
SHOW INDEX FROM contactos;
