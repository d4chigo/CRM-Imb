const { executeQuery, queryOne } = require('../config/database');
const { inferSexByName } = require('../services/genderService');

// --- Schema resolver (singular/plural + columnas variables) ---
let schema = null;
async function resolveSchema() {
  if (schema) return schema;
  // Detectar tabla de contactos
  let table = 'contactos';
  try { await executeQuery('SELECT 1 FROM contacto LIMIT 1'); table = 'contacto'; } catch(_) { /* keep contactos */ }
  // Leer columnas
  const cols = await executeQuery('SHOW COLUMNS FROM ' + table);
  const names = cols.map(c => c.Field);
  const hasNombreCompleto = names.includes('nombre_completo');
  const hasNombre = names.includes('nombre');
  const hasApellido = names.includes('apellido');
  const origenCol = names.includes('origen') ? 'origen' : (names.includes('medio_contacto') ? 'medio_contacto' : 'origen');
  const notasCol = names.includes('notas') ? 'notas' : (names.includes('observaciones') ? 'observaciones' : 'notas');
  schema = { table, hasNombreCompleto, hasNombre, hasApellido, origenCol, notasCol };
  return schema;
}

function nameSelectExpr(s) {
  return s.hasNombreCompleto ? 'nombre_completo' : (s.hasApellido ? "CONCAT_WS(' ', nombre, apellido)" : 'nombre');
}

class ContactsService {
  static async list() {
    const s = await resolveSchema();
    const selectName = nameSelectExpr(s) + ' AS nombre';
    const q = `SELECT id, ${selectName}, email, telefono, dni, tipo, ${s.origenCol} AS origen, ${s.notasCol} AS notas, departamento, sexo, fecha_nacimiento, etiquetas_json, etiqueta_otro, creado_en FROM ${s.table} ORDER BY creado_en DESC`;
    return await executeQuery(q);
  }

  // Etiquetado masivo
  static async bulkTag({ ids = [], etiqueta, etiqueta_otro = null }) {
    if (!Array.isArray(ids) || !ids.length) return { updated: 0 };
    const placeholders = ids.map(()=>'?').join(',');
    // Selección única: sobreescribir con la etiqueta enviada (o vaciar si no hay)
    const payload = etiqueta ? JSON.stringify([etiqueta]) : null;
    const s = await resolveSchema();
    const res = await executeQuery(`UPDATE ${s.table} SET etiquetas_json = ?, etiqueta_otro = ? WHERE id IN (${placeholders})`, [payload, etiqueta_otro || null, ...ids]);
    return { updated: res.affectedRows || 0 };
  }

  // Mover a pipeline: aquí sólo marcamos tipo='cliente'; el movimiento a etapas pipeline puede hacerse en otra tabla/servicio si corresponde
  static async bulkMoveToPipeline({ ids = [] }) {
    if (!Array.isArray(ids) || !ids.length) return { updated: 0 };
    const placeholders = ids.map(()=>'?').join(',');
    const s = await resolveSchema();
    const res = await executeQuery(`UPDATE ${s.table} SET tipo = 'cliente' WHERE id IN (${placeholders})`, ids);
    return { updated: res.affectedRows || 0 };
  }

  static async listPaged({ page = 1, pageSize = 20, search = '', type = '' } = {}) {
    const offset = (page - 1) * pageSize;
    const s = await resolveSchema();
    const where = [];
    const params = [];
    if (search) {
      const nameExpr = s.hasNombreCompleto ? 'LOWER(nombre_completo)' : (s.hasApellido ? "LOWER(CONCAT_WS(' ', nombre, apellido))" : 'LOWER(nombre)');
      where.push(`(${nameExpr} LIKE ? OR LOWER(email) LIKE ? OR telefono LIKE ?)`);
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, `%${search}%`);
    }
    if (type) { where.push('tipo = ?'); params.push(type); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const selectName = nameSelectExpr(s) + ' AS nombre';
    const rows = await executeQuery(`SELECT id, ${selectName}, email, telefono, dni, tipo, ${s.origenCol} AS origen, ${s.notasCol} AS notas, departamento, sexo, fecha_nacimiento, etiquetas_json, etiqueta_otro, creado_en FROM ${s.table} ${whereSql} ORDER BY creado_en DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);

    const totalRow = await executeQuery(`SELECT COUNT(1) AS cnt FROM ${s.table} ${whereSql}`, params);
    const total = totalRow?.[0]?.cnt || 0;
    return { rows, total };
  }

  static async create({ nombre, apellido = null, email, telefono, dni = null, tipo = 'lead', origen, notas, departamento, sexo, fecha_nacimiento, etiquetas = [], etiqueta_otro = null }) {
    const s = await resolveSchema();
    if (!sexo) {
      try { sexo = inferSexByName(nombre); } catch(_) {}
    }
    // Normalizar a selección única
    if (Array.isArray(etiquetas)) etiquetas = etiquetas.length ? [etiquetas[0]] : [];
    else if (typeof etiquetas === 'string' && etiquetas) etiquetas = [etiquetas];
    const etiquetasStr = (etiquetas && etiquetas.length) ? JSON.stringify(etiquetas) : null;
    // Construir columnas dinámicas
    const cols = [];
    const vals = [];
    if (s.hasNombreCompleto) { cols.push('nombre_completo'); vals.push(nombre); }
    else { cols.push('nombre'); vals.push(nombre); if (s.hasApellido) { cols.push('apellido'); vals.push(apellido); } }
    cols.push('email','telefono','dni','tipo', s.origenCol, s.notasCol, 'departamento','sexo','fecha_nacimiento','etiquetas_json','etiqueta_otro');
    vals.push(email, telefono, dni || null, tipo, origen || null, notas || null, departamento || null, sexo || null, fecha_nacimiento || null, etiquetasStr, etiqueta_otro || null);
    const placeholders = cols.map(()=>'?').join(',');
    const result = await executeQuery(`INSERT INTO ${s.table} (${cols.join(',')}) VALUES (${placeholders})`, vals);
    return { id: result.insertId, nombre, email, telefono, dni, tipo, origen, notas, departamento: departamento || null, sexo: sexo || null, fecha_nacimiento: fecha_nacimiento || null, etiquetas, etiqueta_otro: etiqueta_otro || null };
  }

  // Inserción masiva con deduplicación simple por email o teléfono
  static async bulkCreate(rows = []) {
    if (!rows.length) return { inserted: 0, skipped: 0, items: [] };
    // Filtrar filas inválidas
    const cleaned = rows.filter(r => r && r.nombre);
    if (!cleaned.length) return { inserted: 0, skipped: rows.length, items: [] };
    const s = await resolveSchema();
    // Obtener emails y teléfonos para deduplicar existentes
    const emails = cleaned.map(r => r.email).filter(Boolean);
    const phones = cleaned.map(r => r.telefono).filter(Boolean);
    let existing = [];
    if (emails.length || phones.length) {
      const placeholdersEmail = emails.length ? emails.map(()=>'?').join(',') : null;
      const placeholdersPhone = phones.length ? phones.map(()=>'?').join(',') : null;
      const conditions = [];
      const params = [];
      if (placeholdersEmail) { conditions.push(`email IN (${placeholdersEmail})`); params.push(...emails); }
      if (placeholdersPhone) { conditions.push(`telefono IN (${placeholdersPhone})`); params.push(...phones); }
      if (conditions.length) {
        existing = await executeQuery(`SELECT id, email, telefono FROM contactos WHERE ${conditions.join(' OR ')}`, params);
      }
    }
    const existsByEmail = new Set(existing.filter(e=>e.email).map(e=>e.email));
    const existsByPhone = new Set(existing.filter(e=>e.telefono).map(e=>e.telefono));
    const toInsert = [];
    const skipped = [];
    for (const r of cleaned) {
      if ((r.email && existsByEmail.has(r.email)) || (r.telefono && existsByPhone.has(r.telefono))) {
        skipped.push(r);
        continue;
      }
      toInsert.push([
        r.nombre,
        r.email || null,
        r.telefono || null,
        r.tipo || 'lead',
        r.origen || 'google',
        r.notas || null,
        r.departamento || null,
        r.sexo || null,
        r.fecha_nacimiento || null
      ]);
    }
    const items = [];
    if (toInsert.length) {
      const chunks = []; // dividir en lotes para evitar query demasiado grande
      const size = 100;
      for (let i=0;i<toInsert.length;i+=size) chunks.push(toInsert.slice(i,i+size));
      for (const chunk of chunks) {
        const placeholders = chunk.map(()=>'(?,?,?,?,?,?,?,?,?)').join(',');
        const flat = chunk.flat();
        const cols = s.hasNombreCompleto ? ['nombre_completo','email','telefono','tipo', s.origenCol, s.notasCol, 'departamento','sexo','fecha_nacimiento'] : ['nombre','email','telefono','tipo', s.origenCol, s.notasCol, 'departamento','sexo','fecha_nacimiento'];
        const result = await executeQuery(`INSERT INTO ${s.table} (${cols.join(',')}) VALUES ${placeholders}`, flat);
        // No recuperamos cada id exacto (auto inc), opcionalmente podríamos consultar; por simplicidad devolvemos nombres
        items.push(...chunk.map(c=>({ nombre: c[0], email: c[1], telefono: c[2], tipo: c[3], origen: c[4], notas: c[5], departamento: c[6], sexo: c[7], fecha_nacimiento: c[8] })));
      }
    }
    return { inserted: toInsert.length, skipped: skipped.length, items };
  }

  static async get(id) {
    const s = await resolveSchema();
    const selectName = nameSelectExpr(s) + ' AS nombre';
    const row = await queryOne(`SELECT id, ${selectName}, email, telefono, dni, tipo, ${s.origenCol} AS origen, ${s.notasCol} AS notas, departamento, sexo, fecha_nacimiento, etiquetas_json, etiqueta_otro, creado_en FROM ${s.table} WHERE id = ?`, [id]);
    if (!row) return row;
    try { if (row.etiquetas_json && typeof row.etiquetas_json === 'string') row.etiquetas = JSON.parse(row.etiquetas_json); else if (row.etiquetas_json) row.etiquetas = row.etiquetas_json; } catch(_) { row.etiquetas = []; }
    return row;
  }
  static async update(id, { nombre, apellido, email, telefono, dni, tipo, origen, notas, departamento, sexo, fecha_nacimiento, etiquetas, etiqueta_otro }) {
    const s = await resolveSchema();
    const existing = await this.get(id);
    if (!existing) throw new Error('Contacto no encontrado');
    const fields = [];
    const params = [];
    if (nombre !== undefined) {
      if (s.hasNombreCompleto) { fields.push('nombre_completo = ?'); params.push(nombre); }
      else { fields.push('nombre = ?'); params.push(nombre); /* apellido opcional */ }
    }
    if (apellido !== undefined && s.hasApellido) { fields.push('apellido = ?'); params.push(apellido); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (telefono !== undefined) { fields.push('telefono = ?'); params.push(telefono); }
    if (dni !== undefined) { fields.push('dni = ?'); params.push(dni); }
    if (tipo !== undefined) { fields.push('tipo = ?'); params.push(tipo); }
    if (origen !== undefined) { fields.push(`${s.origenCol} = ?`); params.push(origen); }
    if (notas !== undefined) { fields.push(`${s.notasCol} = ?`); params.push(notas); }
    if (departamento !== undefined) { fields.push('departamento = ?'); params.push(departamento); }
    if (sexo !== undefined) { fields.push('sexo = ?'); params.push(sexo); }
    if (fecha_nacimiento !== undefined) { fields.push('fecha_nacimiento = ?'); params.push(fecha_nacimiento); }
    if (etiquetas !== undefined) {
      // Normalizar a selección única
      let norm = etiquetas;
      if (Array.isArray(norm)) norm = norm.length ? [norm[0]] : [];
      else if (typeof norm === 'string' && norm) norm = [norm];
      const payload = (norm && norm.length) ? JSON.stringify(norm) : null;
      fields.push('etiquetas_json = ?');
      params.push(payload);
    }
    if (etiqueta_otro !== undefined) { fields.push('etiqueta_otro = ?'); params.push(etiqueta_otro); }
    if (fields.length) {
      params.push(id);
      await executeQuery(`UPDATE ${s.table} SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return await this.get(id);
  }

  static async remove(id) {
    const s = await resolveSchema();
    const used = await queryOne('SELECT id FROM oportunidades WHERE contacto_id = ? LIMIT 1', [id]);
    if (used) throw new Error('No se puede eliminar: contacto ligado a oportunidades');
    await executeQuery(`DELETE FROM ${s.table} WHERE id = ? LIMIT 1`, [id]);
  }

  // Find duplicate groups by columns (email/telefono)
  static async findDuplicates({ by = ['email','telefono'] } = {}) {
    const s = await resolveSchema();
    const selectName = nameSelectExpr(s) + ' AS nombre';
    const rows = await executeQuery(`SELECT id, ${selectName}, email, telefono, creado_en FROM ${s.table}`);
    const mapBy = {};
    const groups = [];
    for (const row of rows) {
      for (const key of by) {
        const val = (row[key] || '').toString().trim().toLowerCase();
        if (!mapBy[key]) mapBy[key] = {};
        if (!mapBy[key][val]) mapBy[key][val] = [];
        mapBy[key][val].push(row);
      }
    }
    for (const key in mapBy) {
      for (const val in mapBy[key]) {
        const members = mapBy[key][val];
        if (members.length > 1) {
          groups.push({ by: key, value: val, count: members.length, members });
        }
      }
    }
    return groups;
  }

  // Merge duplicate into primary: move oportunidades, keep best data per strategy, delete duplicate
  static async mergeContacts(primaryId, duplicateId, { strategy = 'prefer-filled' } = {}) {
    if (primaryId === duplicateId) throw new Error('IDs iguales');
    const primary = await this.get(primaryId); const duplicate = await this.get(duplicateId);
    if (!primary || !duplicate) throw new Error('Algún contacto no encontrado');
    // Reasignar oportunidades
    await executeQuery('UPDATE oportunidades SET contacto_id = ? WHERE contacto_id = ?', [primaryId, duplicateId]);
    // Construir campos a actualizar según estrategia
    const choose = (p, d) => {
      if (strategy === 'prefer-primary') return p ?? d;
      // prefer-filled: si d está más completo, úsalo
      return (p && String(p).trim() !== '') ? p : d;
    };
    const merged = {
      nombre: choose(primary.nombre, duplicate.nombre),
      email: choose(primary.email, duplicate.email),
      telefono: choose(primary.telefono, duplicate.telefono),
      tipo: choose(primary.tipo, duplicate.tipo),
      origen: choose(primary.origen, duplicate.origen),
      notas: choose(primary.notas, duplicate.notas),
      departamento: choose(primary.departamento, duplicate.departamento),
      sexo: choose(primary.sexo, duplicate.sexo),
      fecha_nacimiento: choose(primary.fecha_nacimiento, duplicate.fecha_nacimiento),
      etiquetas_json: choose(primary.etiquetas_json, duplicate.etiquetas_json),
      etiqueta_otro: choose(primary.etiqueta_otro, duplicate.etiqueta_otro)
    };
    const s = await resolveSchema();
    await executeQuery(`UPDATE ${s.table} SET email=?, telefono=?, tipo=?, ${s.origenCol}=?, ${s.notasCol}=?, departamento=?, sexo=?, fecha_nacimiento=?, etiquetas_json=?, etiqueta_otro=? WHERE id=?`, [merged.email, merged.telefono, merged.tipo, merged.origen, merged.notas, merged.departamento, merged.sexo, merged.fecha_nacimiento || null, merged.etiquetas_json || null, merged.etiqueta_otro || null, primaryId]);
    await executeQuery(`DELETE FROM ${s.table} WHERE id=?`, [duplicateId]);
    return await this.get(primaryId);
  }
}
module.exports = ContactsService;