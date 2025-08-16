-- =================================================================
-- ESQUEMA DE BASE DE DATOS CRM INMOBILIARIO
-- Sistema optimizado para gestión de leads, contactos, propiedades y oportunidades
-- =================================================================

-- Tabla de usuarios del sistema (agentes inmobiliarios, administradores)
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    rol ENUM('agente', 'supervisor', 'admin') DEFAULT 'agente',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
);

-- Tabla de contactos (clientes potenciales y existentes)
CREATE TABLE contactos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    telefono_secundario VARCHAR(20),
    tipo_contacto ENUM('lead', 'cliente', 'prospecto') DEFAULT 'lead',
    fuente_contacto ENUM('web', 'telefono', 'referido', 'redes_sociales', 'evento', 'publicidad', 'otro') DEFAULT 'web',
    presupuesto_min DECIMAL(12,2),
    presupuesto_max DECIMAL(12,2),
    tipo_propiedad_interes ENUM('casa', 'apartamento', 'terreno', 'comercial', 'oficina') DEFAULT 'apartamento',
    zona_interes VARCHAR(200),
    observaciones TEXT,
    fecha_primer_contacto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_contacto TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    agente_asignado_id INT,
    activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (agente_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_telefono (telefono),
    INDEX idx_tipo_contacto (tipo_contacto),
    INDEX idx_fuente_contacto (fuente_contacto),
    INDEX idx_agente_asignado (agente_asignado_id),
    INDEX idx_fecha_ultimo_contacto (fecha_ultimo_contacto),
    INDEX idx_activo (activo)
);

-- Tabla de proyectos inmobiliarios
CREATE TABLE proyectos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(300),
    ciudad VARCHAR(100),
    estado ENUM('planificacion', 'construccion', 'terminado', 'entregado') DEFAULT 'planificacion',
    fecha_inicio_construccion DATE,
    fecha_entrega_estimada DATE,
    total_unidades INT DEFAULT 0,
    unidades_disponibles INT DEFAULT 0,
    precio_desde DECIMAL(12,2),
    precio_hasta DECIMAL(12,2),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_estado (estado),
    INDEX idx_ciudad (ciudad),
    INDEX idx_activo (activo),
    INDEX idx_precio_desde (precio_desde)
);

-- Tabla de propiedades individuales
CREATE TABLE propiedades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    proyecto_id INT,
    tipo_propiedad ENUM('casa', 'apartamento', 'terreno', 'comercial', 'oficina') NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(300),
    ciudad VARCHAR(100),
    area_total DECIMAL(8,2), -- en m²
    area_construida DECIMAL(8,2), -- en m²
    habitaciones INT DEFAULT 0,
    banos INT DEFAULT 0,
    parqueaderos INT DEFAULT 0,
    piso INT,
    precio DECIMAL(12,2) NOT NULL,
    precio_negociable BOOLEAN DEFAULT TRUE,
    estado_propiedad ENUM('disponible', 'reservada', 'vendida', 'construccion') DEFAULT 'disponible',
    estado_publicacion ENUM('activa', 'pausada', 'inactiva') DEFAULT 'activa',
    fecha_construccion DATE,
    fecha_entrega DATE,
    comision_porcentaje DECIMAL(5,2) DEFAULT 3.00,
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE SET NULL,
    INDEX idx_codigo (codigo),
    INDEX idx_proyecto (proyecto_id),
    INDEX idx_tipo_propiedad (tipo_propiedad),
    INDEX idx_ciudad (ciudad),
    INDEX idx_precio (precio),
    INDEX idx_estado_propiedad (estado_propiedad),
    INDEX idx_estado_publicacion (estado_publicacion),
    INDEX idx_habitaciones (habitaciones),
    INDEX idx_area_total (area_total)
);

-- Tabla de oportunidades de venta
CREATE TABLE oportunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contacto_id INT NOT NULL,
    propiedad_id INT NOT NULL,
    agente_id INT NOT NULL,
    etapa ENUM('contacto_inicial', 'calificacion', 'presentacion', 'negociacion', 'propuesta', 'cierre_ganado', 'cierre_perdido') DEFAULT 'contacto_inicial',
    probabilidad_cierre INT DEFAULT 10, -- Porcentaje de 0-100
    valor_estimado DECIMAL(12,2),
    fecha_cierre_estimada DATE,
    fecha_cierre_real DATE,
    motivo_perdida ENUM('precio', 'financiamiento', 'competencia', 'timing', 'no_calificado', 'otro'),
    notas_motivo_perdida TEXT,
    comision_esperada DECIMAL(10,2),
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE,
    FOREIGN KEY (agente_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_contacto (contacto_id),
    INDEX idx_propiedad (propiedad_id),
    INDEX idx_agente (agente_id),
    INDEX idx_etapa (etapa),
    INDEX idx_probabilidad (probabilidad_cierre),
    INDEX idx_fecha_cierre_estimada (fecha_cierre_estimada),
    INDEX idx_fecha_actualizacion (fecha_actualizacion)
);

-- Tabla de historial de interacciones
CREATE TABLE interacciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contacto_id INT NOT NULL,
    oportunidad_id INT,
    usuario_id INT NOT NULL,
    tipo_interaccion ENUM('llamada', 'email', 'reunion', 'visita_propiedad', 'whatsapp', 'sms', 'nota') NOT NULL,
    direccion ENUM('entrante', 'saliente') DEFAULT 'saliente',
    asunto VARCHAR(200),
    descripcion TEXT,
    duracion_minutos INT, -- Para llamadas y reuniones
    resultado ENUM('contactado', 'no_contactado', 'callback', 'interesado', 'no_interesado', 'programar_reunion') DEFAULT 'contactado',
    fecha_programada TIMESTAMP, -- Para actividades futuras
    completada BOOLEAN DEFAULT TRUE,
    fecha_interaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_contacto (contacto_id),
    INDEX idx_oportunidad (oportunidad_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_tipo_interaccion (tipo_interaccion),
    INDEX idx_fecha_interaccion (fecha_interaccion),
    INDEX idx_fecha_programada (fecha_programada),
    INDEX idx_completada (completada)
);

-- Tabla de actividades programadas (seguimiento)
CREATE TABLE actividades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contacto_id INT NOT NULL,
    oportunidad_id INT,
    usuario_responsable_id INT NOT NULL,
    tipo_actividad ENUM('llamada', 'reunion', 'email', 'visita_propiedad', 'seguimiento') NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_programada TIMESTAMP NOT NULL,
    duracion_minutos INT DEFAULT 30,
    estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada') DEFAULT 'pendiente',
    prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
    recordatorio_minutos INT DEFAULT 15,
    notas_resultado TEXT,
    fecha_completada TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_responsable_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_contacto (contacto_id),
    INDEX idx_oportunidad (oportunidad_id),
    INDEX idx_usuario_responsable (usuario_responsable_id),
    INDEX idx_fecha_programada (fecha_programada),
    INDEX idx_estado (estado),
    INDEX idx_prioridad (prioridad)
);

-- Tabla de documentos asociados
CREATE TABLE documentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contacto_id INT,
    oportunidad_id INT,
    propiedad_id INT,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_documento ENUM('contrato', 'identificacion', 'comprobante_ingresos', 'autorizacion_credito', 'planos', 'imagenes', 'otro') NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamano_bytes BIGINT,
    usuario_subida_id INT NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contacto_id) REFERENCES contactos(id) ON DELETE CASCADE,
    FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_subida_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_contacto (contacto_id),
    INDEX idx_oportunidad (oportunidad_id),
    INDEX idx_propiedad (propiedad_id),
    INDEX idx_tipo_documento (tipo_documento),
    INDEX idx_fecha_subida (fecha_subida)
);
