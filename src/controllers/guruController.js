const db = require('../db');
const { auditedQuery } = require('../db/audit');

// Logic untuk Assign Guru ke Mapel & Kelas (Upsert: Update or Insert)
const assignGuruToMapelKelas = async (req, res, next) => {
  try {
    const { guruId, mapelId, kelasId } = req.params;

    if (!guruId || !mapelId || !kelasId) {
      return res.status(400).json({
        message: "ID Guru, Mapel, dan Kelas wajib ada."
      });
    }

    // Cek dulu apakah sudah ada kombinasi mapel + kelas
    const checkQuery = `
      SELECT id 
      FROM guru_mapel_kelas 
      WHERE mapel_id = $1 AND kelas_id = $2
    `;

    const checkRes = await db.query(checkQuery, [mapelId, kelasId]);

    let result;

    if (checkRes.rows.length > 0) {
      // ============================
      // UPDATE (PASTI TERLOG AUDIT)
      // ============================
      const updateQuery = `
        UPDATE guru_mapel_kelas
        SET guru_id = $1
        WHERE mapel_id = $2 AND kelas_id = $3
      `;

      const updated = await auditedQuery(updateQuery, [guruId, mapelId, kelasId], req);
      result = updated.rows[0]; // RETURNING * otomatis ditambah oleh auditedQuery

    } else {
      // ============================
      // INSERT (PASTI TERLOG AUDIT)
      // ============================
      const insertQuery = `
        INSERT INTO guru_mapel_kelas (guru_id, mapel_id, kelas_id)
        VALUES ($1, $2, $3)
      `;

      const inserted = await auditedQuery(insertQuery, [guruId, mapelId, kelasId], req);
      result = inserted.rows[0]; // RETURNING * otomatis ditambah oleh auditedQuery
    }

    return res.status(200).json({
      message: "Berhasil menyimpan penugasan guru",
      data: result
    });

  } catch (err) {
    console.error("Error assign guru:", err);

    // Foreign key violation
    if (err.code === "23503") {
      return res.status(404).json({
        message: "Data Guru, Mapel, atau Kelas tidak valid/tidak ditemukan."
      });
    }

    next(err);
  }
};

// Logic untuk Get Data Penugasan Guru
const getGuruAssignments = async (req, res, next) => {
  try {
    const { guruId } = req.params;
    const q = `SELECT gmk.*, m.nama_mapel, k.nama_kelas
               FROM guru_mapel_kelas gmk
               JOIN mapel m ON m.id = gmk.mapel_id
               JOIN kelas k ON k.id = gmk.kelas_id
               WHERE gmk.guru_id = $1`;
    
    const { rows } = await db.query(q, [guruId]);
    res.json(rows);
  } catch (err) { 
    next(err); 
  }
};

module.exports = {
  assignGuruToMapelKelas,
  getGuruAssignments
};