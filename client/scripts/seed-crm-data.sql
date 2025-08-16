-- =================================================================
-- DATOS DE EJEMPLO PARA PRUEBAS
-- =================================================================

-- Insertar usuarios de ejemplo
INSERT INTO usuarios (nombre, apellido, email, telefono, rol) VALUES
('Juan', 'Pérez', 'juan.perez@inmobiliaria.com', '+51987654321', 'agente'),
('María', 'García', 'maria.garcia@inmobiliaria.com', '+51987654322', 'supervisor'),
('Carlos', 'López', 'carlos.lopez@inmobiliaria.com', '+51987654323', 'agente'),
('Ana', 'Rodríguez', 'ana.rodriguez@inmobiliaria.com', '+51987654324', 'admin');

-- Insertar proyecto de ejemplo
INSERT INTO proyectos (nombre, descripcion, direccion, ciudad, estado, fecha_entrega_estimada, total_unidades, unidades_disponibles, precio_desde, precio_hasta) VALUES
('Residencial Los Pinos', 'Moderno conjunto residencial con áreas verdes y amenidades', 'Av. Principal 123, Los Pinos', 'Lima', 'construccion', '2025-12-01', 48, 35, 180000.00, 280000.00);

-- Insertar propiedades de ejemplo
INSERT INTO propiedades (codigo, proyecto_id, tipo_propiedad, titulo, descripcion, direccion, ciudad, area_total, area_construida, habitaciones, banos, parqueaderos, precio, estado_propiedad) VALUES
('LP-001', 1, 'apartamento', 'Departamento 2 hab - Torre A', 'Moderno departamento con vista panorámica', 'Torre A - Piso 5', 'Lima', 85.50, 75.20, 2, 2, 1, 220000.00, 'disponible'),
('LP-002', 1, 'apartamento', 'Departamento 3 hab - Torre B', 'Amplio departamento familiar', 'Torre B - Piso 8', 'Lima', 105.30, 95.10, 3, 2, 1, 280000.00, 'disponible'),
('CASA-001', NULL, 'casa', 'Casa en San Isidro', 'Hermosa casa independiente', 'Calle Las Flores 456', 'Lima', 200.00, 180.00, 4, 3, 2, 450000.00, 'disponible');

-- Insertar contactos de ejemplo
INSERT INTO contactos (nombre, apellido, email, telefono, tipo_contacto, fuente_contacto, presupuesto_min, presupuesto_max, tipo_propiedad_interes, zona_interes, agente_asignado_id) VALUES
('Ana', 'Martínez', 'ana@email.com', '+51987654321', 'lead', 'web', 200000.00, 250000.00, 'apartamento', 'San Isidro', 1),
('Carlos', 'Ruiz', 'carlos@email.com', '+51987654322', 'prospecto', 'referido', 400000.00, 500000.00, 'casa', 'Miraflores', 2),
('Luis', 'Torres', 'luis@email.com', '+51987654323', 'cliente', 'redes_sociales', 250000.00, 300000.00, 'apartamento', 'San Borja', 3),
('Patricia', 'Silva', 'patricia@email.com', '+51987654324', 'lead', 'publicidad', 180000.00, 220000.00, 'apartamento', 'Surco', 1);

-- Insertar oportunidades de ejemplo
INSERT INTO oportunidades (contacto_id, propiedad_id, agente_id, etapa, probabilidad_cierre, valor_estimado, fecha_cierre_estimada) VALUES
(1, 1, 1, 'contacto_inicial', 10, 220000.00, '2024-02-15'),
(2, 3, 2, 'calificacion', 25, 450000.00, '2024-02-20'),
(3, 2, 3, 'presentacion', 40, 280000.00, '2024-02-10'),
(4, 1, 1, 'negociacion', 60, 220000.00, '2024-01-30');

-- Insertar actividades de ejemplo
INSERT INTO actividades (contacto_id, oportunidad_id, usuario_responsable_id, tipo_actividad, titulo, descripcion, fecha_programada, prioridad) VALUES
(1, 1, 1, 'llamada', 'Llamada de seguimiento', 'Contactar para agendar visita', '2024-01-20 10:00:00', 'alta'),
(2, 2, 2, 'reunion', 'Reunión con cliente', 'Presentación del proyecto', '2024-01-21 15:30:00', 'alta'),
(3, 3, 3, 'visita_propiedad', 'Visita guiada', 'Mostrar departamento Torre B', '2024-01-22 11:00:00', 'media');
