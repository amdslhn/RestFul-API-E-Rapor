const db = require('../db');

function extractTableName(query) {
  const q = query.trim().toLowerCase();

  if (q.startsWith("update")) return q.match(/^update\s+(\w+)/)?.[1];
  if (q.startsWith("delete")) return q.match(/^delete\s+from\s+(\w+)/)?.[1];
  if (q.startsWith("insert")) return q.match(/^insert\s+into\s+(\w+)/)?.[1];
  if (q.startsWith("select")) return q.match(/^select\s+\*\s+from\s+(\w+)/)?.[1];

  return null;
}

async function auditedQuery(text, params, req) {
  let before = null;
  let after = null;

  const lower = text.trim().toLowerCase();
  const table = extractTableName(text);

  const whereCol = text.match(/where\s+(\w+)\s*=/i)?.[1];
  const whereVal = params?.[params.length - 1];

  // Ambil sebelum UPDATE/DELETE
  if ((lower.startsWith("update") || lower.startsWith("delete")) 
      && table && whereCol) {

    const qBefore = `SELECT * FROM ${table} WHERE ${whereCol} = $1`;
    const oldData = await db.query(qBefore, [whereVal]);
    before = oldData.rows?.[0] || null;
  }

  // Untuk DELETE, pakai RETURNING * agar bisa lihat data yang dihapus
  let queryText = text;
  if (lower.startsWith("delete") && !/returning/i.test(text)) {
    queryText += " RETURNING *";
  }

  // Eksekusi query utama
  const result = await db.query(queryText, params);

  // Ambil data setelah INSERT/UPDATE
  if (lower.startsWith("insert") || lower.startsWith("update") || lower.startsWith("delete")) {
    after = result.rows?.[0] || null;
  }

  // Kalau GET/SELECT, kita bisa simpan data hasil SELECT
  if (lower.startsWith("select") && table) {
    after = result.rows || null;
  }

  // Simpan ke req agar bisa di audit log
  if (req) {
    req.auditBefore = before;
    req.auditAfter = after;
    req.auditTable = table;
  }

  return result;
}

module.exports = { auditedQuery };
