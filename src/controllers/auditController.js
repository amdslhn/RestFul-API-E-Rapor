const db = require('../db');

async function listAudit(req, res, next) {
  try {
    const { userId } = req.query;

    let q = `
      SELECT 
        a.id,
        a.user_id,
        u.nama AS user_nama,
        u.email AS user_email,
        a.role,
        a.action,
        a.method,
        a.endpoint,
        a.ip_address,
        a.status_code,
        a.user_agent,
        a.description,
        a.before_data,
        a.after_data,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
    `;

    const params = [];
    if (userId) {
      params.push(userId);
      q += ` WHERE a.user_id = $1`;
    }

    q += ` ORDER BY a.created_at DESC LIMIT 1000`;

    const { rows } = await db.query(q, params);
    res.json(rows);

  } catch (err) {
    next(err);
  }
}

module.exports = { listAudit };
