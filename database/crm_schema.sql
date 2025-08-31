-- Esquema de base de datos CRM-Imb (MySQL 5.7+)
-- Contiene únicamente definición de tablas, claves foráneas e índices.
-- No incluye datos de ejemplo ni sentencias INSERT.

-- Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS `crm_imb`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `crm_imb`;

-- Tabla de usuarios del sistema (agentes, supervisores, administradores)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_completo` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL, -- Hash bcrypt de la contraseña
  `telefono` VARCHAR(40),
  `rol` ENUM('agente', 'supervisor', 'admin') DEFAULT 'agente',
  `activo` BOOLEAN DEFAULT TRUE,
  `ultimo_login` DATETIME,
  `refresh_token` TEXT, -- Token de refresco para renovación de sesión
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_rol` (`rol`),
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de agentes/comerciales (mantener compatibilidad)
CREATE TABLE IF NOT EXISTS `agentes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` INT UNSIGNED, -- Referencia a tabla usuarios
  `nombre_completo` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) UNIQUE,
  `telefono` VARCHAR(40),
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de contactos/clientes potenciales
CREATE TABLE IF NOT EXISTS `contactos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_completo` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160),
  `telefono` VARCHAR(40) UNIQUE,
  `tipo` ENUM('lead','prospecto','cliente') DEFAULT 'lead',
  `origen` VARCHAR(80),
  `notas` TEXT,
  `creado_en` DATETIME NOT NULL UNIQUE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Catálogo de servicios ofrecidos (p. ej., Compra/Venta/Crédito/Programa)
CREATE TABLE IF NOT EXISTS `servicios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(80) NOT NULL,
  `descripcion` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_servicios_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Etapas/columnas del pipeline (identificador estable usado por la app)
CREATE TABLE IF NOT EXISTS `etapas_pipeline` (
  `id` VARCHAR(64) NOT NULL,          -- Ej.: 'contacto_inicial'
  `titulo` VARCHAR(80) NOT NULL,      -- Ej.: 'Contacto Inicial'
  `color_hex` VARCHAR(9) NOT NULL,    -- Ej.: '#94A3B8'
  `orden` INT NOT NULL DEFAULT 0,     -- Orden de visualización
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Oportunidades de venta (alineado con el modelo del frontend: nombre de servicio)
CREATE TABLE IF NOT EXISTS `oportunidades` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contacto_id` INT UNSIGNED,
  `agente_id` INT UNSIGNED,
  `servicio_id` INT UNSIGNED NOT NULL,
  `etapa_id` VARCHAR(64) NOT NULL,

  `nombre_cliente` VARCHAR(120) NOT NULL,
  `valor_usd` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `probabilidad` TINYINT UNSIGNED NOT NULL,
  `fecha_cierre` DATE,
  `telefono` VARCHAR(40),
  `email` VARCHAR(160),

  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  CONSTRAINT `fk_opo_contacto` FOREIGN KEY (`contacto_id`) REFERENCES `contactos`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_opo_agente`   FOREIGN KEY (`agente_id`)   REFERENCES `agentes`(`id`)   ON DELETE SET NULL,
  CONSTRAINT `fk_opo_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_opo_etapa`    FOREIGN KEY (`etapa_id`)    REFERENCES `etapas_pipeline`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_opo_probabilidad` CHECK (`probabilidad` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices para optimizar consultas
CREATE INDEX `idx_opo_servicio` ON `oportunidades`(`servicio_id`);
CREATE INDEX `idx_opo_etapa`    ON `oportunidades`(`etapa_id`);
CREATE INDEX `idx_opo_agente`   ON `oportunidades`(`agente_id`);
CREATE INDEX `idx_opo_contacto` ON `oportunidades`(`contacto_id`);
CREATE INDEX `idx_opo_cliente`  ON `oportunidades`(`nombre_cliente`);

-- Registro de actividades relacionadas a oportunidades (emails, llamadas, etc.)
CREATE TABLE IF NOT EXISTS `actividades` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `oportunidad_id` INT UNSIGNED,
  `tipo` ENUM('email','llamada','reunion','nota') NOT NULL,
  `asunto` VARCHAR(200),
  `notas` TEXT,
  `fecha_programada` DATETIME,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_act_oportunidad` FOREIGN KEY (`oportunidad_id`) REFERENCES `oportunidades`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- DATOS BÁSICOS NECESARIOS
-- =================================================================

-- Insertar servicios básicos si no existen
INSERT IGNORE INTO servicios (id, nombre, descripcion) VALUES
(1, 'Compra/Venta', 'Servicios de compra y venta de propiedades'),
(2, 'Crédito Hipotecario', 'Asesoría en créditos hipotecarios'),
(3, 'Programa VIP', 'Programa especializado para clientes VIP'),
(4, 'Consultoría', 'Servicios de consultoría inmobiliaria');

-- Insertar etapas del pipeline si no existen
INSERT IGNORE INTO etapas_pipeline (id, titulo, color_hex, orden) VALUES
('contacto_inicial', 'Contacto Inicial', '#94A3B8', 1),
('calificacion', 'Calificación', '#F59E0B', 2), 
('presentacion', 'Presentación', '#3B82F6', 3),
('negociacion', 'Negociación', '#EF4444', 4),
('cierre', 'Cierre', '#10B981', 5);

-- Insertar usuario admin único si no existe (password: admin123 - debe cambiarse luego)
-- Hash generado con bcrypt cost 10 para 'admin123'
INSERT IGNORE INTO usuarios (id, nombre_completo, email, password_hash, rol) VALUES
(1, 'Administrador', 'admin@crm-imb.com', '$2b$10$8Yp4ZJx1syI7Ssqw9kM6iO2mymQ0TsQpmgx9m.AVXni4eWh05rqR2', 'admin');
