const db = require('../db');

async function guruHandleMapelKelas(guruId, mapelId, kelasId) {
  const q2 = `SELECT 1 FROM guru_mapel_kelas WHERE guru_id=$1 AND mapel_id=$2 AND kelas_id=$3 LIMIT 1`;
  const { rowCount } = await db.query(q2, [guruId, mapelId, kelasId]);
  return rowCount > 0;
}

async function createNilai(req, res, next) {
  try {
    const { siswaId, mapelId, semester } = req.params;
    const { nilai } = req.body; 
    const guru_id = req.user.id;

    // 1. Cek apakah Siswa punya Kelas?
    // (Penting: Nilai harus terikat pada kelas siswa saat itu)
    const kq = `SELECT kelas_id FROM siswa_kelas WHERE siswa_id=$1 LIMIT 1`;
    const { rows: krows } = await db.query(kq, [siswaId]);
    
    if (!krows[0]) {
        return res.status(400).json({ message: 'Siswa belum terdaftar di kelas manapun' });
    }
    
    // Kita ambil ID kelas dari data siswa
    // (Jadi kalau siswa kelas 10, nilai masuk ke rapor kelas 10)
    const kelas_id = krows[0].kelas_id;

    // 2. Cek Role Guru (Wajib)
    if (req.user.role !== 'guru') {
        return res.status(403).json({ message: 'Hanya guru yang dapat input nilai' });
    }

    // --- BAGIAN INI DIHAPUS (Bypass Validasi Jadwal) ---
    // const allowed = await guruHandleMapelKelas(guru_id, mapelId, kelas_id);
    // if (!allowed) return res.status(403)...
    // ----------------------------------------------------

    // --- LOGIC UPSERT (Simpan/Update) ---
    // Cek apakah nilai sudah ada?
    const checkQ = `SELECT id FROM nilai WHERE siswa_id=$1 AND mapel_id=$2 AND semester=$3 LIMIT 1`;
    const { rows: existingRows } = await db.query(checkQ, [siswaId, mapelId, semester]);

    let result;

    if (existingRows.length > 0) {
      // UPDATE: Jika sudah ada, update nilainya & update guru_id (biar tercatat siapa yang terakhir ubah)
      const updateQ = `
        UPDATE nilai 
        SET nilai_angka = $1, guru_id = $2, updated_at = NOW() 
        WHERE id = $3 
        RETURNING *
      `;
      const { rows } = await db.query(updateQ, [nilai, guru_id, existingRows[0].id]);
      result = rows[0];
      
    } else {
      // INSERT: Jika belum ada, buat baru
      const insertQ = `
        INSERT INTO nilai (siswa_id, mapel_id, guru_id, nilai_angka, semester) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `;
      const { rows } = await db.query(insertQ, [siswaId, mapelId, guru_id, nilai, semester]);
      result = rows[0];
    }

    res.status(201).json(result);

  } catch (err) { 
    next(err); 
  }
}

async function updateNilai(req, res, next) {
  try {
    const { nilaiId } = req.params; // id of nilai row
    const { nilai } = req.body;
    const guru_id = req.user.id;

    const q0 = 'SELECT * FROM nilai WHERE id=$1';
    const { rows: r0 } = await db.query(q0, [nilaiId]);
    const existing = r0[0];
    if (!existing) return res.status(404).json({ message: 'Nilai tidak ditemukan' });

    const kq = `SELECT kelas_id FROM siswa_kelas WHERE siswa_id=$1 LIMIT 1`;
    const { rows: krows } = await db.query(kq, [existing.siswa_id]);
    if (!krows[0]) return res.status(400).json({ message: 'Siswa belum terdaftar di kelas' });
    const kelas_id = krows[0].kelas_id;

    if (req.user.role !== 'guru') return res.status(403).json({ message: 'Hanya guru yang dapat edit nilai' });
    const allowed = await guruHandleMapelKelas(guru_id, existing.mapel_id, kelas_id);
    if (!allowed) return res.status(403).json({ message: 'Anda tidak mengajar mapel ini di kelas siswa tersebut' });

    const q = `UPDATE nilai SET nilai_angka=$1, updated_at=NOW() WHERE id=$2 RETURNING *`;
    const { rows } = await db.query(q, [nilai, nilaiId]);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function listNilai(req, res, next) {
  try {
    const { siswaId, semester } = req.params;

    if (req.user.role === 'siswa') {
      const sem = semester || null;
      const q = `SELECT n.*, m.nama_mapel, u.nama as guru_nama
                 FROM nilai n
                 JOIN mapel m ON m.id = n.mapel_id
                 LEFT JOIN users u ON u.id = n.guru_id
                 WHERE n.siswa_id = $1 ${sem ? "AND n.semester=$2" : ""}`;
                 
      const params = sem ? [req.user.id, sem] : [req.user.id];
      const { rows } = await db.query(q, params);
      return res.json(rows);
    }

    if (req.user.role === 'admin') {
      let q = `SELECT n.*, m.nama_mapel, u.nama as guru_nama FROM nilai n JOIN mapel m ON m.id=n.mapel_id LEFT JOIN users u ON u.id=n.guru_id`;
      const params = [];
      const conditions = [];
      if (siswaId) { conditions.push(`n.siswa_id=$${params.length+1}`); params.push(siswaId); }
      if (semester) { conditions.push(`n.semester=$${params.length+1}`); params.push(semester); }
      if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
      const { rows } = await db.query(q, params);
      return res.json(rows);
    }

    if (req.user.role === 'guru') {
      const qk = `SELECT DISTINCT kelas_id FROM guru_mapel_kelas WHERE guru_id=$1`;
      const { rows: krows } = await db.query(qk, [req.user.id]);
      const kelasIds = krows.map(r => r.kelas_id);
      if (kelasIds.length === 0) return res.json([]);

      let q = `SELECT n.*, m.nama_mapel, u.nama as guru_nama FROM nilai n
               JOIN mapel m ON m.id = n.mapel_id
               LEFT JOIN users u ON u.id = n.guru_id
               JOIN siswa_kelas sk ON sk.siswa_id = n.siswa_id
               WHERE sk.kelas_id = ANY($1::int[])`;
      const params = [kelasIds];
      if (siswaId) {
        q += ' AND n.siswa_id = $2';
        params.push(siswaId);
      }
      if (semester) {
        q += (params.length === 1 ? ' AND ' : ' AND ') + ` n.semester = $${params.length + 1}`;
        params.push(semester);
      }
      const { rows } = await db.query(q, params);
      return res.json(rows);
    }

    res.status(403).json({ message: 'Forbidden' });
  } catch (err) { next(err); }
}

async function getNilaiByKelas(user, kelasId, semester = null) {
  // Base Query: Tetap pakai DISTINCT ON untuk jaga-jaga kalau ada data duplikat
  const baseSelect = `
    SELECT DISTINCT ON (n.siswa_id, n.mapel_id, n.semester) 
      n.*, 
      m.nama_mapel, 
      m.kkm, 
      u_guru.nama as guru_nama, 
      u_siswa.nama as student_name 
    FROM nilai n
    JOIN mapel m ON m.id = n.mapel_id
    LEFT JOIN users u_guru ON u_guru.id = n.guru_id
    LEFT JOIN users u_siswa ON u_siswa.id = n.siswa_id 
    JOIN siswa_kelas sk ON sk.siswa_id = n.siswa_id
  `;

  // Wajib ada ORDER BY karena kita pakai DISTINCT ON
  const orderByClause = ` ORDER BY n.siswa_id, n.mapel_id, n.semester, n.updated_at DESC`;

  // --- 1. Role Siswa (Hanya lihat nilai sendiri) ---
  if (user.role === 'siswa') {
    let q = `${baseSelect} WHERE sk.kelas_id = $1 AND n.siswa_id = $2`;
    const params = [kelasId, user.id];
    
    if (semester) {
      q += ` AND n.semester = $3`;
      params.push(semester);
    }
    
    q += orderByClause;
    const { rows } = await db.query(q, params);
    return rows;
  }

  // --- 2. Role Guru (PERUBAHAN DISINI) ---
  if (user.role === 'guru') {
    // KITA HAPUS validasi 'guru_mapel_kelas'. 
    // Gantinya, kita filter langsung bahwa n.guru_id HARUS sama dengan user.id
    
    let q = `${baseSelect} WHERE sk.kelas_id = $1 AND n.guru_id = $2`;
    const params = [kelasId, user.id]; // Filter: Kelas sesuai request, Guru sesuai login

    if (semester) {
      q += ` AND n.semester = $3`;
      params.push(semester);
    }

    q += orderByClause;

    const { rows } = await db.query(q, params);
    return rows;
  }

  // --- 3. Role Admin (Bisa lihat semua nilai di kelas tersebut) ---
  if (user.role === 'admin') {
    let q = `${baseSelect} WHERE sk.kelas_id = $1`;
    const params = [kelasId];

    if (semester) {
      q += ` AND n.semester = $2`;
      params.push(semester);
    }

    q += orderByClause;
    const { rows } = await db.query(q, params);
    return rows;
  }

  throw new ApiError('Forbidden', 403);
}

async function handleGetNilaiByKelas(req, res, next) {
  try {
    const { kelasId } = req.params;
    const { semester } = req.query;

    // Panggil logic function yang lama di sini
    const rows = await getNilaiByKelas(req.user, kelasId, semester);
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getNilaiBySiswa(req, res, next) {
  try {
    const { siswaId } = req.params;  // Ambil dari URL /:siswaId
    const { semester } = req.query;  // Ambil dari ?semester=1

    // Kita pakai LEFT JOIN supaya kalau mapel/guru tidak ketemu, data nilai tetap muncul!
    let q = `
      SELECT 
        n.id, 
        n.siswa_id, 
        n.nilai_angka, 
        n.semester,
        n.mapel_id, 
        m.nama_mapel,
        m.kkm, 
        u.nama as guru_nama
      FROM nilai n
      LEFT JOIN mapel m ON m.id = n.mapel_id
      LEFT JOIN users u ON u.id = n.guru_id
      WHERE n.siswa_id = $1
    `;

    const params = [siswaId];

    // Jika user kirim ?semester=..., tambahkan filter
    if (semester) {
      q += ` AND n.semester = $2`;
      params.push(semester);
    }

    // Urutkan biar rapi
    q += ` ORDER BY n.semester ASC, n.created_at DESC`;

    const { rows } = await db.query(q, params);

    // Cek kalau kosong, kasih pesan jelas tapi array tetap return
    if (rows.length === 0) {
      return res.status(200).json({ 
        message: "Data tidak ditemukan untuk siswa ini", 
        data: [] 
      });
    }

    return res.json(rows);

  } catch (err) {
    next(err);
  }
}

module.exports = { createNilai, updateNilai, listNilai, getNilaiByKelas,handleGetNilaiByKelas, getNilaiBySiswa };
