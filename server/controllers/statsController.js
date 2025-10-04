const { executeQuery } = require('../config/database');
const { inferSexByName } = require('../services/genderService');

// Detecta la tabla real de contactos (singular o plural)
async function resolveContactsTable() {
  try { await executeQuery('SELECT 1 FROM contacto LIMIT 1'); return 'contacto'; } catch(_) {}
  return 'contactos';
}

// Utilidad para parsear rangos de edad desde query string: "25-30,35-40"
function parseRanges(rangesStr) {
  if (!rangesStr) return [ [25,30], [35,40] ];
  const parts = rangesStr.split(',').map(s => s.trim()).filter(Boolean);
  const ranges = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a <= b) ranges.push([a,b]);
    }
  }
  return ranges.length ? ranges : [ [25,30], [35,40] ];
}

// Intenta obtener edades desde columna "edad"; si falla, usa TIMESTAMPDIFF(fecha_nacimiento)
async function fetchAges(table) {
  try {
    const rows = await executeQuery(`SELECT edad FROM ${table} WHERE edad IS NOT NULL`);
    if (Array.isArray(rows) && rows.length) return rows.map(r => ({ edad: r.edad }));
  } catch(_) { /* fallback abajo */ }
  const calc = await executeQuery(`SELECT TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad FROM ${table} WHERE fecha_nacimiento IS NOT NULL`);
  return calc;
}

class StatsController {
  static async contactsByDepartment(req, res) {
    try {
      const table = await resolveContactsTable();
      const baseSql = `SELECT departamento AS label, COUNT(*) AS count
         FROM ${table}
         WHERE departamento IS NOT NULL AND departamento <> ''
         GROUP BY departamento
         ORDER BY count DESC`;
      let rows;
      if (req.query.limit) {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 100));
  const lim = Number(limit) > 0 && Number(limit) < 10000 ? Number(limit) : 100;
  rows = await executeQuery(baseSql + ' LIMIT ' + lim);
      } else {
        rows = await executeQuery(baseSql);
      }
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[stats] contactsByDepartment error:', e.message);
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas por departamento' });
    }
  }

  static async contactsBySex(req, res) {
    try {
      const table = await resolveContactsTable();
      const baseSql = `SELECT COALESCE(sexo, 'ND') AS label, COUNT(*) AS count
         FROM ${table}
         GROUP BY sexo
         ORDER BY count DESC`;
      let rows;
      if (req.query.limit) {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 10));
  const lim2 = Number(limit) > 0 && Number(limit) < 10000 ? Number(limit) : 100;
  rows = await executeQuery(baseSql + ' LIMIT ' + lim2);
      } else {
        rows = await executeQuery(baseSql);
      }
      const mapped = rows.map(r => ({
        label: r.label === 'M' ? 'Masculino' : r.label === 'F' ? 'Femenino' : r.label === 'O' ? 'Otro' : 'Sin dato',
        count: r.count,
        raw: r.label,
      }));
      res.json({ success: true, data: mapped });
    } catch (e) {
      console.error('[stats] contactsBySex error:', e.message);
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas por sexo' });
    }
  }

  static async contactsByAgeRanges(req, res) {
    try {
      const table = await resolveContactsTable();
      const ages = await fetchAges(table);
      let buckets;
      if (req.query.ranges) {
        const ranges = parseRanges(req.query.ranges);
        buckets = ranges.map(([a,b]) => ({ label: `${a}-${b}`, from: a, to: b, count: 0 }));
      } else {
        buckets = [
          { label: '0-17', from: 0, to: 17, count: 0 },
          { label: '18-24', from: 18, to: 24, count: 0 },
          { label: '25-34', from: 25, to: 34, count: 0 },
          { label: '35-44', from: 35, to: 44, count: 0 },
          { label: '45-54', from: 45, to: 54, count: 0 },
          { label: '55-64', from: 55, to: 64, count: 0 },
          { label: '65+', from: 65, to: 200, count: 0 },
        ];
      }

      let sinDato = 0;
      try {
        const nullCountRows = await executeQuery(`SELECT COUNT(*) AS c FROM ${table} WHERE fecha_nacimiento IS NULL`);
        sinDato = nullCountRows[0]?.c || 0;
      } catch(_) {}

      for (const row of ages) {
        const e = row.edad;
        for (const b of buckets) {
          if (typeof e === 'number' && e >= b.from && e <= b.to) { b.count++; break; }
        }
      }
      const data = buckets.map(({ label, count }) => ({ label, count }));
      if (sinDato > 0) data.push({ label: 'Sin dato', count: sinDato });

      res.json({ success: true, data });
    } catch (e) {
      console.error('[stats] contactsByAgeRanges error:', e.message);
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas por edad' });
    }
  }

  static async inferSexAndUpdate(req, res) {
    try {
      const table = await resolveContactsTable();
      const rows = await executeQuery(
        `SELECT id, nombre_completo, sexo FROM ${table} WHERE sexo IS NULL OR sexo = '' OR sexo = 'O'`
      );
      let updated = 0;
      for (const r of rows) {
        const inferred = inferSexByName(r.nombre_completo);
        if (inferred && inferred !== r.sexo) {
          await executeQuery(`UPDATE ${table} SET sexo = ? WHERE id = ?`, [inferred, r.id]);
          updated++;
        }
      }
      res.json({ success: true, updated, totalCandidates: rows.length });
    } catch (e) {
      console.error('[stats] inferSexAndUpdate error:', e.message);
      res.status(500).json({ success: false, message: 'Error infiriendo sexo' });
    }
  }
}

module.exports = StatsController;
