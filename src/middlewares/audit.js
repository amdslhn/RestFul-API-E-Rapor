  const db = require('../db');

  async function auditLog(req, res, next) {
    // jangan mengeksekusi DB saat require; semua dilakukan saat request
    let beforeData = null;
    let afterData = null;

    const userId = req.user ? req.user.id : null;
    const role = req.user ? req.user.role : null;

    const method = req.method;
    const endpoint = req.originalUrl;
    const action = `${method} ${req.path}`;
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    // ambil targetId: prioritas dari req.params, lalu fallback ke last path segment (boleh string)
    let targetId =
      req.params?.id ||
      req.params?.kelasId ||
      req.params?.siswaId ||
      req.params?.guruId ||
      null;

    if (!targetId) {
      const parts = endpoint.split('?')[0].split('/').filter(Boolean);
      const last = parts.length ? parts[parts.length - 1] : null;
      // hanya gunakan last segment kalau bukan nama resource (mis: 'kelas' bukan id)
      if (last && !['kelas','siswa','guru','mapel','nilai','api','v1'].includes(last.toLowerCase())) {
        targetId = last;
      }
    }

    // table map yang aman — jangan menulis tableName langsung dari user input
    const tableMap = {
      '/kelas': 'kelas',
      '/api/kelas': 'kelas',
      '/siswa': 'users',
      '/api/siswa': 'users',
      '/guru': 'users',
      '/mapel': 'mapel',
      '/api/mapel': 'mapel',
      '/nilai': 'nilai',
      '/api/nilai': 'nilai'
    };

    const matchedPath = Object.keys(tableMap).find(p => endpoint.startsWith(p));
    const tableName = matchedPath ? tableMap[matchedPath] : null;

    // BEFORE DATA untuk UPDATE / DELETE
    if (['PUT','PATCH','DELETE'].includes(method) && targetId && tableName) {
      try {
        const q = `SELECT * FROM ${tableName} WHERE id = $1`;
        const { rows } = await db.query(q, [targetId]);
        beforeData = rows[0] || null;
      } catch (err) {
        console.error('Audit: error fetching beforeData', err?.message || err);
        beforeData = null;
      }
    }

    // Tangkap response finish -> ambil status & afterData, lalu insert audit
    res.on('finish', async () => {
      const status = res.statusCode;

      // AFTER DATA:
      // - PUT/PATCH: baca ulang dari DB agar sesuai state akhir
      // - POST: jika controller meletakkan created row di res.locals.insertedRow, pakai itu.
      //         kalau tidak, fallback ke req.body (lebih baik daripada null)
      // - DELETE: afterData = null
      try {
        if (['PUT','PATCH'].includes(method) && targetId && tableName) {
          try {
            const q = `SELECT * FROM ${tableName} WHERE id = $1`;
            const { rows } = await db.query(q, [targetId]);
            afterData = rows[0] || null;
          } catch (err) {
            console.error('Audit: error fetching afterData', err?.message || err);
            afterData = null;
          }
        } else if (method === 'POST') {
          // preferensi: controller menyimpan row yang dibuat di res.locals.insertedRow
          if (res.locals && res.locals.insertedRow) {
            afterData = res.locals.insertedRow;
          } else {
            afterData = req.body ?? null;
          }
        } else if (method === 'DELETE') {
          afterData = null;
        } else {
          afterData = null;
        }

        const description = JSON.stringify({
          params: req.params,
          query: req.query
        });

        const qInsert = `
          INSERT INTO audit_log (
            user_id, role, action, method, endpoint, ip_address,
            user_agent, status_code, description, before_data, after_data
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `;

        await db.query(qInsert, [
          userId,
          role,
          action,
          method,
          endpoint,
          ip,
          userAgent,
          status,
          description,
          beforeData ? JSON.stringify(beforeData) : null,
          afterData ? JSON.stringify(afterData) : null
        ]);
      } catch (err) {
        console.error('Audit insert failed:', err?.message || err);
      }
    });

    // lanjut ke controller (penting: jangan next() setelah finish listener)
    next();
  }

  module.exports = { auditLog };
