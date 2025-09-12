const { executeQuery } = require('../config/database');
const { inferSexByName } = require('../services/genderService');

// Utilidad para parsear rangos de edad desde query string: "25-30,35-40"
function parseRanges(rangesStr) {
  if (!rangesStr) return [ [25,30], [35,40] ]; // valores por defecto solicitados
  const parts = rangesStr.split(',').map(s => s.trim()).filter(Boolean);
  const ranges = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a <= b) {
        ranges.push([a,b]);
      }
    }
  }
  return ranges.length ? ranges : [ [25,30], [35,40] ];
}

class StatsController {
  static async contactsByDepartment(req, res) {
    try {
      const baseSql = `SELECT departamento AS label, COUNT(*) AS count
         FROM contactos
         WHERE departamento IS NOT NULL AND departamento <> ''
         GROUP BY departamento
         ORDER BY count DESC`;
      let rows;
      if (req.query.limit) {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 100));
        rows = await executeQuery(baseSql + ' LIMIT ?', [limit]);
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
      const baseSql = `SELECT COALESCE(sexo, 'ND') AS label, COUNT(*) AS count
         FROM contactos
         GROUP BY sexo
         ORDER BY count DESC`;
      let rows;
      if (req.query.limit) {
        const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 10));
        rows = await executeQuery(baseSql + ' LIMIT ?', [limit]);
      } else {
        rows = await executeQuery(baseSql);
      }
      // Mapear etiquetas legibles
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
      const ages = await executeQuery(
        `SELECT TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
         FROM contactos
         WHERE fecha_nacimiento IS NOT NULL`
      );
      let buckets;
      if (req.query.ranges) {
        const ranges = parseRanges(req.query.ranges);
        buckets = ranges.map(([a,b]) => ({ label: `${a}-${b}`, from: a, to: b, count: 0 }));
      } else {
        // buckets por defecto (no filtrados por usuario): 0-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
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

      // Contar nulos por separado
      const nullCountRows = await executeQuery(
        `SELECT COUNT(*) AS c FROM contactos WHERE fecha_nacimiento IS NULL`
      );
      const sinDato = nullCountRows[0]?.c || 0;

      for (const row of ages) {
        const e = row.edad;
        for (const b of buckets) {
          if (typeof e === 'number' && e >= b.from && e <= b.to) {
            b.count++;
            break;
          }
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
      // Obtener contactos sin sexo definido o marcado como 'O'
      const rows = await executeQuery(
        `SELECT id, nombre_completo, sexo
         FROM contactos
         WHERE sexo IS NULL OR sexo = '' OR sexo = 'O'`
      );
      let updated = 0;
      for (const r of rows) {
        const inferred = inferSexByName(r.nombre_completo);
        if (inferred && inferred !== r.sexo) {
          await executeQuery(`UPDATE contactos SET sexo = ? WHERE id = ?`, [inferred, r.id]);
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
