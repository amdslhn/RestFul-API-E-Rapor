const db = require("../db");
const { hashPassword } = require("../utils/helpers");

async function listUsers(req, res, next) {
  try {
    const { role } = req.query;
    let q = "SELECT id, nama, email, role, created_at FROM users";
    let params = [];
    if (role) {
      q += " WHERE role = $1";
      params.push(role);
    }
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;
    const q =
      "SELECT id, nama, email, role, created_at FROM users WHERE id = $1";
    const { rows } = await db.query(q, [userId]);
    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { nama, email, password, role, nip, nisn } = req.body;

    // Ambil user lama dulu
    const { rows: oldRows } = await db.query('SELECT role FROM users WHERE id=$1', [userId]);
    if (!oldRows[0]) return res.status(404).json({ message: 'User tidak ditemukan' });
    const oldRole = oldRows[0].role;

    const parts = [];
    const params = [];
    let idx = 1;

    if (nama) {
      parts.push(`nama=$${idx++}`);
      params.push(nama);
    }

    if (email) {
      parts.push(`email=$${idx++}`);
      params.push(email);
    }

    if (role) {
      parts.push(`role=$${idx++}`);
      params.push(role);

      if (role === 'guru') {
        if (!nip) return res.status(400).json({ message: 'NIP wajib diisi saat mengubah role ke guru' });
        parts.push(`nip=$${idx++}`);
        params.push(nip);
        parts.push(`nisn=$${idx++}`);
        params.push(null);
      } else if (role === 'siswa') {
        if (!nisn) return res.status(400).json({ message: 'NISN wajib diisi saat mengubah role ke siswa' });
        parts.push(`nisn=$${idx++}`);
        params.push(nisn);
        parts.push(`nip=$${idx++}`);
        params.push(null);
      } else if (role === 'admin') {
        parts.push(`nip=$${idx++}`);
        params.push(null);
        parts.push(`nisn=$${idx++}`);
        params.push(null);
      }
    }

    if (password) {
      const hashed = await hashPassword(password);
      parts.push(`password_hash=$${idx++}`);
      params.push(hashed);
    }

    if (parts.length === 0)
      return res.status(400).json({ message: 'Nothing to update' });

    params.push(userId);
    const q = `UPDATE users SET ${parts.join(', ')} WHERE id=$${idx} RETURNING id, nama, email, role, nip, nisn, created_at`;
    const { rows } = await db.query(q, params);

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}


async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    // Cek apakah user ada
    const qCheck = "SELECT id FROM users WHERE id = $1";
    const check = await db.query(qCheck, [userId]);
    if (!check.rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    // Eksekusi hapus
    const q = "DELETE FROM users WHERE id = $1 RETURNING id, nama, email, role";
    const { rows } = await db.query(q, [userId]);

    res.json({
      message: "User deleted successfully",
      deleted: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function getAllSiswa(req, res, next) {
  try {
    const q = `
      SELECT 
        u.id AS siswa_id,
        u.nama AS siswa_nama,
        u.email,
        u.role,
        u.created_at,
        k.id AS kelas_id,
        k.nama_kelas
      FROM users u
      LEFT JOIN siswa_kelas sk ON sk.siswa_id = u.id
      LEFT JOIN kelas k ON k.id = sk.kelas_id
      WHERE u.role = 'siswa'
      ORDER BY u.nama
    `;

    const { rows } = await db.query(q);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getAllGuru(req, res, next) {
  try {
    const q =
      "SELECT id, nama, email, role, created_at FROM users WHERE role = 'guru'";
    const { rows } = await db.query(q);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllSiswa,
  getAllGuru,
};
