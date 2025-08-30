-- Script de base de datos CRM con autenticación JWT
-- Tablas optimizadas para el sistema de autenticación

-- 1. Tabla de usuarios para autenticación
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- 2. Tabla de contactos (clientes y leads)
CREATE TABLE IF NOT EXISTS contactos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    telefono_secundario VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(50),
    estado_provincia VARCHAR(50),
    codigo_postal VARCHAR(20),
    pais VARCHAR(50) DEFAULT 'Perú',
    fecha_nacimiento DATE,
    ocupacion VARCHAR(100),
    empresa VARCHAR(100),
    tipo_contacto ENUM('prospecto', 'cliente', 'inquilino', 'propietario') DEFAULT 'prospecto',
    canal_origen ENUM('web', 'telefono', 'email', 'referido', 'evento', 'redes_sociales', 'otros') DEFAULT 'web',
    estado ENUM('nuevo', 'contactado', 'cualificado', 'propuesta', 'negociacion', 'cerrado_ganado', 'cerrado_perdido') DEFAULT 'nuevo',
    puntuacion_lead INT DEFAULT 0,
    notas TEXT,
    usuario_asignado_id INT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_telefono (telefono),
    INDEX idx_tipo_contacto (tipo_contacto),
    INDEX idx_estado (estado),
    INDEX idx_usuario_asignado (usuario_asignado_id),
    INDEX idx_fecha_creacion (fecha_creacion),
    
    FOREIGN KEY (usuario_asignado_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Tabla de propiedades/servicios
CREATE TABLE IF NOT EXISTS propiedades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo_propiedad ENUM('casa', 'departamento', 'oficina', 'local_comercial', 'terreno', 'edificio', 'otros') NOT NULL,
    tipo_operacion ENUM('venta', 'alquiler', 'alquiler_temporal') NOT NULL,
    precio DECIMAL(12,2) NOT NULL,
    moneda ENUM('PEN', 'USD') DEFAULT 'PEN',
    direccion VARCHAR(255) NOT NULL,
    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    codigo_postal VARCHAR(20),
    area_total DECIMAL(8,2),
    area_construida DECIMAL(8,2),
    dormitorios INT,
    banos INT,
    cocheras INT,
    pisos INT,
    antiguedad INT,
    estado_propiedad ENUM('nuevo', 'muy_bueno', 'bueno', 'para_remodelar', 'para_demoler') DEFAULT 'bueno',
    caracteristicas JSON,
    imagenes JSON,
    contacto_propietario_id INT,
    usuario_responsable_id INT,
    estado ENUM('disponible', 'reservada', 'vendida', 'alquilada', 'fuera_mercado') DEFAULT 'disponible',
    destacada BOOLEAN DEFAULT FALSE,
    fecha_publicacion DATE,
    fecha_actualizacion_precio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visitas_virtuales INT DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tipo_propiedad (tipo_propiedad),
    INDEX idx_tipo_operacion (tipo_operacion),
    INDEX idx_precio (precio),
    INDEX idx_distrito (distrito),
    INDEX idx_estado (estado),
    INDEX idx_destacada (destacada),
    INDEX idx_activa (activa),
    INDEX idx_fecha_publicacion (fecha_publicacion),
    
    FOREIGN KEY (contacto_propietario_id) REFERENCES contactos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_responsable_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Tabla de oportunidades de negocio
CREATE TABLE IF NOT EXISTS oportunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    contacto_id INT NOT NULL,
    propiedad_id INT,
    usuario_asignado_id INT,
    etapa ENUM('prospectacion', 'contacto_inicial', 'calificacion', 'presentacion', 'propuesta', 'negociacion', 'cierre') DEFAULT 'prospectacion',
    probabilidad INT DEFAULT 10,
    valor_estimado DECIMAL(12,2),
    moneda ENUM('PEN', 'USD') DEFAULT 'PEN',
    fecha_cierre_estimada DATE,
    fecha_cierre_real DATE,
    razon_perdida VARCHAR(255),
    estado ENUM('abierta', 'ganada', 'perdida', 'pausada') DEFAULT 'abierta',
    origen ENUM('web', 'llamada', 'email', 'referido', 'evento', 'marketing') DEFAULT 'web',
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_contacto_id (contacto_id),
    INDEX idx_propiedad_id (propiedad_id),
    INDEX idx_usuario_asignado_id (usuario_asignado_id),
    INDEX idx_etapa (etapa),
    INDEX idx_estado (estado),
    INDEX idx_fecha_cierre_estimada (fecha_cierre_estimada),
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_asignado_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Tabla de actividades y seguimientos
CREATE TABLE IF NOT EXISTS actividades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('llamada', 'email', 'reunion', 'visita', 'seguimiento', 'otro') NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    descripcion TEXT,
    contacto_id INT,
    oportunidad_id INT,
    propiedad_id INT,
    usuario_id INT NOT NULL,
    fecha_programada DATETIME,
    fecha_completada DATETIME,
    duracion_minutos INT,
    estado ENUM('programada', 'completada', 'cancelada', 'reprogramada') DEFAULT 'programada',
    resultado TEXT,
    prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_contacto_id (contacto_id),
    INDEX idx_oportunidad_id (oportunidad_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_programada (fecha_programada),
    INDEX idx_estado (estado),
    INDEX idx_tipo (tipo),
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertar usuario administrador por defecto
INSERT IGNORE INTO users (name, email, password, role) 
VALUES ('Administrador', 'admin@crmimb.com', '$2b$10$dummy.hash.replace.with.real', 'admin');
