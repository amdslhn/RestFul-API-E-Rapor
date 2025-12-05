const db = require('../db');
const { auditedQuery } = require('../db/audit');

async function createKelas(req, res, next) {
  // Asumsi objek 'db' sudah tersedia dan merupakan koneksi/pool pg
  try {
    // Ekstrak data dari body request
    const { id, nama_kelas, tingkat, jurusan } = req.body;

    // Validasi input dasar
    if (!id || !nama_kelas || tingkat === undefined || !jurusan) {
      return res.status(400).json({
        message: 'Semua kolom (id, nama_kelas, tingkat, jurusan) harus diisi.'
      });
    }

    // Query untuk membuat kelas
    const q = 'INSERT INTO kelas (id, nama_kelas, tingkat, jurusan) VALUES ($1, $2, $3, $4) RETURNING *';

    // Nilai-nilai yang akan dimasukkan ke query
    const values = [id, nama_kelas, tingkat, jurusan];

    // Eksekusi query
    const { rows } = await db.query(q, values);

    // Cek apakah ada baris yang ditambahkan (seharusnya selalu 1 jika berhasil)
    if (rows.length === 0) {
      // Jika ini terjadi, kemungkinan ada masalah pada database (misalnya, foreign key error)
      return res.status(500).json({
        message: 'Gagal membuat kelas. Periksa batasan database.'
      });
    }

    // Kirim respons sukses (Status 201 Created untuk INSERT)
    res.status(201).json(rows[0]);
  } catch (err) {
    // Tangani error
    // Jika error disebabkan oleh duplikasi ID (ID Kelas sudah ada), Anda bisa menangkapnya di sini
    console.error('Error saat membuat kelas:', err);
    res.status(500).json({ 
      message: 'Gagal menyimpan kelas. Mungkin ID Kelas sudah ada.' 
    });
    // Anda bisa memilih untuk menggunakan next(err) untuk error handler global
    // next(err); 
  }
}

async function listKelas(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM kelas ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
}

async function getKelasById(req, res, next) {
  try {
    const { kelasId } = req.params;
    const { rows } = await db.query('SELECT * FROM kelas WHERE id=$1', [kelasId]);
    if (!rows[0]) return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function updateKelas(req, res, next) {
  try {
    const { kelasId } = req.params;
    const { nama_kelas, tingkat, jurusan } = req.body;

    // Validasi sederhana
    if (!nama_kelas || tingkat === undefined || jurusan === undefined) {
      return res.status(400).json({
        message: "nama_kelas, tingkat, dan jurusan wajib diisi"
      });
    }

    const q = `
      UPDATE kelas 
      SET nama_kelas = $1, tingkat = $2, jurusan = $3
      WHERE id = $4
      RETURNING *;
    `;

    const params = [nama_kelas, tingkat, jurusan, kelasId];
    const { rows } = await auditedQuery(q, params, req);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Kelas tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}


async function deleteKelas(req, res, next) {
  try {
    const { kelasId } = req.params;
    await auditedQuery('DELETE FROM kelas WHERE id=$1', [kelasId], req);
    res.json({ message: 'Kelas dihapus' });
  } catch (err) { next(err); }
}

async function addSiswaToKelas(req, res, next) {
  try {
    const { kelasId, siswaId } = req.params;
    const q = 'INSERT INTO siswa_kelas (siswa_id, kelas_id) VALUES ($1,$2) RETURNING *';
    const { rows } = await db.query(q, [siswaId, kelasId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function removeSiswaFromKelas(req, res, next) {
  try {
    const { kelasId, siswaId } = req.params;

    // Query untuk menghapus siswa dari kelas
    const q = 'DELETE FROM siswa_kelas WHERE siswa_id=$1 AND kelas_id=$2 RETURNING *';
    const { rows } = await db.query(q, [siswaId, kelasId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan di kelas ini' });
    }

    res.json({ message: 'Siswa berhasil dihapus dari kelas', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listSiswaByKelas(req, res, next) {
  try {
    const { kelasId } = req.params;
    const q = `SELECT u.id, u.nama, u.email
               FROM users u
               JOIN siswa_kelas sk ON sk.siswa_id = u.id
               WHERE sk.kelas_id = $1`;
    const { rows } = await db.query(q, [kelasId]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function getKelasByGuruId(req, res, next) {
  try {
    const { guruId } = req.params;

    // Query: ambil kelas beserta daftar mapel yang diajar guru
    const q = `
      SELECT k.id, k.nama_kelas, k.tingkat, k.jurusan,
             STRING_AGG(m.nama_mapel, ', ') AS mapel_diajar
      FROM kelas k
      JOIN guru_mapel_kelas gmk ON gmk.kelas_id = k.id
      JOIN mapel m ON m.id = gmk.mapel_id
      WHERE gmk.guru_id = $1
      GROUP BY k.id, k.nama_kelas, k.tingkat, k.jurusan
      ORDER BY k.nama_kelas
    `;

    const { rows } = await db.query(q, [guruId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Guru belum mengajar kelas apapun' });
    }

    res.json(rows);
  } catch (err) {
    console.error('Error getKelasByGuruId:', err);
    next(err);
  }
}

module.exports = {
  createKelas,
  listKelas,
  getKelasById,
  updateKelas,
  deleteKelas,
  addSiswaToKelas,
  listSiswaByKelas,
  removeSiswaFromKelas,
  getKelasByGuruId
};
