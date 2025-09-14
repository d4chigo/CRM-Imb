// Configuración de conexión a MySQL para CRM Inmobiliario
const mysql = require('mysql2/promise');
const config = require('./config');

// Pool de conexiones para optimizar el rendimiento
// Uso de pool evita crear/destruir conexiones constantemente
const pool = mysql.createPool(config.database);

// Función para probar la conexión a la base de datos
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos MySQL');
    connection.release(); // Liberar la conexión de vuelta al pool
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    process.exit(1); // Terminar la aplicación si no hay conexión a BD
  }
}

// Función helper para ejecutar queries con manejo de errores
async function executeQuery(query, params = []) {
  try {
    const normParams = Array.isArray(params) ? params : [params];
    const [results] = await pool.execute(query, normParams);
    return results;
  } catch (error) {
    try {
      const previewParams = Array.isArray(params) ? params : [params];
      console.error('Error ejecutando query:', error.message, '\nSQL:', query, '\nParams:', JSON.stringify(previewParams));
    } catch(_) {
      console.error('Error ejecutando query:', error.message, '\nSQL:', query, '\nParams: <no serializable>');
    }
    throw error;
  }
}

// Función helper para obtener una sola fila
async function queryOne(query, params = []) {
  const results = await executeQuery(query, params);
  return results[0] || null;
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  queryOne,
};

// Auto-migración ligera para asegurar columnas recientes (tipo, origen, notas en contactos; orden en etapas_pipeline)
async function ensureSchema() {
  try {
    const conn = await pool.getConnection();
    const dbName = config.database.database; // nombre de BD
    // Helpers primero
    async function columnExists(table, column) {
      const [rows] = await conn.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`, [dbName, table, column]);
      return rows.length > 0;
    }

    // --- OAuth tokens persistentes por usuario (Google Contacts) ---
    if (await tableExists('usuario')) {
      const usuarioTable = 'usuario';
      if (!(await columnExists(usuarioTable,'google_access_token'))) {
        await conn.query(`ALTER TABLE ${usuarioTable} ADD COLUMN google_access_token TEXT NULL`);
        console.log('🛠️  Columna usuario.google_access_token añadida');
      }
      if (!(await columnExists(usuarioTable,'google_refresh_token'))) {
        await conn.query(`ALTER TABLE ${usuarioTable} ADD COLUMN google_refresh_token TEXT NULL`);
        console.log('🛠️  Columna usuario.google_refresh_token añadida');
      }
      if (!(await columnExists(usuarioTable,'google_scope'))) {
        await conn.query(`ALTER TABLE ${usuarioTable} ADD COLUMN google_scope TEXT NULL`);
        console.log('🛠️  Columna usuario.google_scope añadida');
      }
      if (!(await columnExists(usuarioTable,'google_expiry'))) {
        await conn.query(`ALTER TABLE ${usuarioTable} ADD COLUMN google_expiry BIGINT NULL`);
        console.log('🛠️  Columna usuario.google_expiry añadida');
      }
    }
    async function tableExists(table) {
      const [rows] = await conn.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`, [dbName, table]);
      return rows.length > 0;
    }
    async function viewExists(view) {
      const [rows] = await conn.query(`SELECT 1 FROM information_schema.views WHERE table_schema = ? AND table_name = ? LIMIT 1`, [dbName, view]);
      return rows.length > 0;
    }
    // --- Compatibilidad de nombres singular/plural via VISTAS ---
    // Si existen tablas en singular pero no en plural, crear vistas con nombres esperados por partes del sistema legado
    async function ensureViewPlural(plural, singular) {
      const hasPluralTable = await tableExists(plural);
      const hasPluralView = await viewExists(plural);
      const hasSingularTable = await tableExists(singular);
      if (!hasPluralTable && !hasPluralView && hasSingularTable) {
        await conn.query(`CREATE OR REPLACE VIEW ${plural} AS SELECT * FROM ${singular}`);
        console.log(`🔗 Vista de compatibilidad creada: ${plural} -> ${singular}`);
      }
    }
    await ensureViewPlural('usuarios','usuario');
    await ensureViewPlural('agentes','agente');
    await ensureViewPlural('contactos','contacto');
    await ensureViewPlural('servicios','cotizacion');
    await ensureViewPlural('oportunidades','oportunidad');
    await ensureViewPlural('actividades','actividad');
    // Resolver tabla de contactos (singular/plural)
    const contactsTable = (await tableExists('contacto')) ? 'contacto' : 'contactos';
    // contactos
    if (!(await columnExists(contactsTable,'tipo'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN tipo ENUM('lead','prospecto','cliente') DEFAULT 'lead' AFTER telefono`);
      console.log('🛠️  Columna contactos.tipo añadida');
    }
    // Soportar alias medio_contacto
    if (!(await columnExists(contactsTable,'origen')) && !(await columnExists(contactsTable,'medio_contacto'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN origen VARCHAR(80) AFTER tipo`);
      console.log('🛠️  Columna contactos.origen añadida');
    }
    if (!(await columnExists(contactsTable,'notas')) && !(await columnExists(contactsTable,'observaciones'))) {
      // añadir notas si no existe ninguna de ambas
      const afterCol = (await columnExists(contactsTable,'origen')) || !(await columnExists(contactsTable,'medio_contacto')) ? 'origen' : 'medio_contacto';
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN notas TEXT AFTER ${afterCol}`);
      console.log('🛠️  Columna contactos.notas añadida');
    }
    // Nuevas columnas para estadísticas: ubicación, sexo y fecha de nacimiento
    if (!(await columnExists(contactsTable,'departamento'))) {
      // ubicar después de notas/observaciones si existen
      const after = (await columnExists(contactsTable,'notas')) ? 'notas' : ((await columnExists(contactsTable,'observaciones')) ? 'observaciones' : 'origen');
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN departamento VARCHAR(80) NULL AFTER ${after}`);
      console.log('🛠️  Columna contactos.departamento añadida');
    }
    if (!(await columnExists(contactsTable,'sexo'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN sexo ENUM('M','F','O') NULL AFTER departamento`);
      console.log('🛠️  Columna contactos.sexo añadida');
    }
    if (!(await columnExists(contactsTable,'fecha_nacimiento'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN fecha_nacimiento DATE NULL AFTER sexo`);
      console.log('🛠️  Columna contactos.fecha_nacimiento añadida');
    }
    // Documento nacional de identidad (DNI)
    if (!(await columnExists(contactsTable,'dni'))) {
      // lo ubicamos después de telefono para UX
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN dni VARCHAR(32) NULL AFTER telefono`);
      console.log('🛠️  Columna contactos.dni añadida');
    }
    // Etiquetas para clasificar contactos
    if (!(await columnExists(contactsTable,'etiquetas_json'))) {
      try {
        await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN etiquetas_json JSON NULL AFTER fecha_nacimiento`);
        console.log('🛠️  Columna contactos.etiquetas_json añadida');
      } catch (e) {
        // Fallback para MySQL sin JSON real: usar TEXT
        await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN etiquetas_json TEXT NULL AFTER fecha_nacimiento`);
        console.log('🛠️  Columna contactos.etiquetas_json (TEXT fallback) añadida');
      }
    }
    if (!(await columnExists(contactsTable,'etiqueta_otro'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN etiqueta_otro VARCHAR(160) NULL AFTER etiquetas_json`);
      console.log('🛠️  Columna contactos.etiqueta_otro añadida');
    }
    // Asegurar columna simple 'edad' (INT) para analítica y filtros rápidos
    if (!(await columnExists(contactsTable,'edad'))) {
      await conn.query(`ALTER TABLE ${contactsTable} ADD COLUMN edad INT NULL AFTER fecha_nacimiento`);
      console.log('🛠️  Columna contactos.edad añadida (INT)');
      // Backfill con TIMESTAMPDIFF
      await conn.query(`UPDATE ${contactsTable} SET edad = TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) WHERE fecha_nacimiento IS NOT NULL`);
      console.log('↻ contactos.edad backfilled para registros existentes');
      // Intentar crear triggers para mantener edad sincronizada
      try {
        // BEFORE INSERT
        await conn.query(`DROP TRIGGER IF EXISTS ${contactsTable}_bi_edad`);
        await conn.query(`CREATE TRIGGER ${contactsTable}_bi_edad BEFORE INSERT ON ${contactsTable}
          FOR EACH ROW
          BEGIN
            IF NEW.fecha_nacimiento IS NOT NULL THEN
              SET NEW.edad = TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE());
            END IF;
          END`);
        // BEFORE UPDATE
        await conn.query(`DROP TRIGGER IF EXISTS ${contactsTable}_bu_edad`);
        await conn.query(`CREATE TRIGGER ${contactsTable}_bu_edad BEFORE UPDATE ON ${contactsTable}
          FOR EACH ROW
          BEGIN
            IF NEW.fecha_nacimiento <> OLD.fecha_nacimiento THEN
              IF NEW.fecha_nacimiento IS NOT NULL THEN
                SET NEW.edad = TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE());
              ELSE
                SET NEW.edad = NULL;
              END IF;
            END IF;
          END`);
        console.log('⚙️  Triggers de sincronización de edad creados');
      } catch (e) {
        console.warn('⚠️  No se pudieron crear triggers de edad:', e.message);
      }
    }
    // etapas_pipeline
    if (!(await columnExists('etapas_pipeline','orden'))) {
      await conn.query(`ALTER TABLE etapas_pipeline ADD COLUMN orden INT NOT NULL DEFAULT 0 AFTER color_hex`);
      console.log('🛠️  Columna etapas_pipeline.orden añadida');
    }
    // --- Campos realistas para cotizacion (catálogo de servicios/quotes) ---
    if (await tableExists('cotizacion')) {
      const cot = 'cotizacion';
      // Precio base y moneda
      if (!(await columnExists(cot, 'precio_base'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN precio_base DECIMAL(14,2) NULL AFTER descripcion`);
        console.log('🛠️  cotizacion.precio_base añadida');
      }
      if (!(await columnExists(cot, 'moneda'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN moneda VARCHAR(8) NOT NULL DEFAULT 'USD' AFTER precio_base`);
        console.log('🛠️  cotizacion.moneda añadida');
      }
      // IGV / impuestos y descuento
      if (!(await columnExists(cot, 'incluye_igv'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN incluye_igv BOOLEAN NOT NULL DEFAULT false AFTER moneda`);
        console.log('🛠️  cotizacion.incluye_igv añadida');
      }
      if (!(await columnExists(cot, 'igv_porcentaje'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN igv_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 18.00 AFTER incluye_igv`);
        console.log('🛠️  cotizacion.igv_porcentaje añadida');
      }
      if (!(await columnExists(cot, 'descuento_porcentaje'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN descuento_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER igv_porcentaje`);
        console.log('🛠️  cotizacion.descuento_porcentaje añadida');
      }
      // Vigencia y términos
      if (!(await columnExists(cot, 'vigencia_dias'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN vigencia_dias INT NOT NULL DEFAULT 30 AFTER descuento_porcentaje`);
        console.log('🛠️  cotizacion.vigencia_dias añadida');
      }
      if (!(await columnExists(cot, 'condiciones_pago'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN condiciones_pago TEXT NULL AFTER vigencia_dias`);
        console.log('🛠️  cotizacion.condiciones_pago añadida');
      }
      if (!(await columnExists(cot, 'notas'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN notas TEXT NULL AFTER condiciones_pago`);
        console.log('🛠️  cotizacion.notas añadida');
      }
      if (!(await columnExists(cot, 'items_json'))) {
        try {
          await conn.query(`ALTER TABLE ${cot} ADD COLUMN items_json JSON NULL AFTER notas`);
        } catch (_) {
          await conn.query(`ALTER TABLE ${cot} ADD COLUMN items_json TEXT NULL AFTER notas`);
        }
        console.log('🛠️  cotizacion.items_json añadida (JSON/TEXT)');
      }
      // Información de propiedad (resumen)
      if (!(await columnExists(cot, 'propiedad_tipo'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN propiedad_tipo VARCHAR(40) NULL AFTER items_json`);
        console.log('🛠️  cotizacion.propiedad_tipo añadida');
      }
      if (!(await columnExists(cot, 'propiedad_ubicacion'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN propiedad_ubicacion VARCHAR(255) NULL AFTER propiedad_tipo`);
        console.log('🛠️  cotizacion.propiedad_ubicacion añadida');
      }
      if (!(await columnExists(cot, 'area_m2'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN area_m2 DECIMAL(10,2) NULL AFTER propiedad_ubicacion`);
        console.log('🛠️  cotizacion.area_m2 añadida');
      }
      if (!(await columnExists(cot, 'dormitorios'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN dormitorios TINYINT NULL AFTER area_m2`);
        console.log('🛠️  cotizacion.dormitorios añadida');
      }
      if (!(await columnExists(cot, 'banos'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN banos TINYINT NULL AFTER dormitorios`);
        console.log('🛠️  cotizacion.banos añadida');
      }
      if (!(await columnExists(cot, 'estacionamientos'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN estacionamientos TINYINT NULL AFTER banos`);
        console.log('🛠️  cotizacion.estacionamientos añadida');
      }
      if (!(await columnExists(cot, 'estado'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN estado VARCHAR(40) NULL AFTER estacionamientos`);
        console.log('🛠️  cotizacion.estado añadida');
      }
      if (!(await columnExists(cot, 'mantenimiento_mensual'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN mantenimiento_mensual DECIMAL(12,2) NULL AFTER estado`);
        console.log('🛠️  cotizacion.mantenimiento_mensual añadida');
      }
      if (!(await columnExists(cot, 'fecha_entrega'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN fecha_entrega DATE NULL AFTER mantenimiento_mensual`);
        console.log('🛠️  cotizacion.fecha_entrega añadida');
      }
      if (!(await columnExists(cot, 'amoblado'))) {
        await conn.query(`ALTER TABLE ${cot} ADD COLUMN amoblado BOOLEAN NULL AFTER fecha_entrega`);
        console.log('🛠️  cotizacion.amoblado añadida');
      }
    }
    // Semilla de etapas por defecto si la tabla está vacía
    const [countRows] = await conn.query(`SELECT COUNT(*) AS c FROM etapas_pipeline`);
    if (countRows[0].c === 0) {
      const defaults = [
        { id: 'contacto_inicial', titulo: 'Contacto Inicial', color: '#94A3B8', orden: 1 },
        { id: 'calificacion', titulo: 'Calificación', color: '#FCBA00', orden: 2 },
        { id: 'presentacion', titulo: 'Presentación', color: '#F59E0B', orden: 3 },
        { id: 'negociacion', titulo: 'Negociación', color: '#EF4444', orden: 4 },
        { id: 'propuesta', titulo: 'Propuesta', color: '#8B5CF6', orden: 5 },
        { id: 'cierre_ganado', titulo: 'Cierre Ganado', color: '#10B981', orden: 6 },
      ];
      for (const d of defaults) {
        await conn.query(`INSERT INTO etapas_pipeline (id, titulo, color_hex, orden) VALUES (?,?,?,?)`, [d.id, d.titulo, d.color, d.orden]);
      }
  console.log('🌱 Etapas por defecto insertadas (solo primera inicialización)');
    }
    conn.release();
  } catch (e) {
    console.error('⚠️  Error en ensureSchema:', e.message);
  }
}

module.exports.ensureSchema = ensureSchema;
