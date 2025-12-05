const db = require('../db');

async function createMapel(req, res, next) {
  try {
    // 1. Debugging: Cek apakah data sampai ke backend
    console.log("Isi Body:", req.body); 

    const { id, nama_mapel, kkm } = req.body;

    // Validasi sederhana (opsional tapi bagus)
    if (!id) throw new Error("ID tidak boleh kosong!");

    const q = `
      INSERT INTO mapel (id, nama_mapel, kkm)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const { rows } = await db.query(q, [id, nama_mapel, kkm]);
    res.status(201).json(rows[0]);
  } catch (err) {
    // 2. Jangan panggil variabel 'id' di sini karena tidak dikenali
    console.error("Error terjadi:", err.message); 
    next(err);
  }
}


async function listMapel(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM mapel ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
}

async function getMapelById(req, res, next) {
  try {
    const { mapelId } = req.params;
    const q = 'SELECT * FROM mapel WHERE id=$1';
    const { rows } = await db.query(q, [mapelId]);
    if (!rows[0]) return res.status(404).json({ message: 'Mapel tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function updateMapel(req, res, next) {
  try {
    const { mapelId } = req.params;  // id lama
    const { id: newId, nama_mapel, kkm } = req.body; // id baru + field lain

    // Cek dulu apakah mapel ada
    const cek = await db.query('SELECT id FROM mapel WHERE id=$1', [mapelId]);
    if (!cek.rows[0]) return res.status(404).json({ message: 'Mapel tidak ditemukan' });

    // Update id, nama_mapel, dan kkm
    const q = `
      UPDATE mapel
      SET id = $1,
          nama_mapel = $2,
          kkm = $3
      WHERE id = $4
      RETURNING *
    `;
    const { rows } = await db.query(q, [newId, nama_mapel, kkm, mapelId]);

    res.json(rows[0]);
  } catch (err) {
    console.error("Error update mapel:", err.message);
    next(err);
  }
}


async function deleteMapel(req, res, next) {
  try {
    const { mapelId } = req.params;

    // cek dulu apakah ada
    const cek = await db.query('SELECT id FROM mapel WHERE id=$1', [mapelId]);
    if (!cek.rows[0]) return res.status(404).json({ message: 'Mapel tidak ditemukan' });

    // hapus
    await db.query('DELETE FROM mapel WHERE id=$1', [mapelId]);

    res.json({ message: 'Mapel berhasil dihapus' });
  } catch (err) { next(err); }
}

module.exports = { createMapel, listMapel, getMapelById, updateMapel, deleteMapel };