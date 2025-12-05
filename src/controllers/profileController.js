const db = require('../db');
const { comparePassword, hashPassword } = require('../utils/helpers');
async function updatePassword(req, res, next) {
  try {
    const { userId } = req.params; // bisa juga ambil dari token auth
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validasi input
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Password baru dan konfirmasi tidak sama' });
    }

    // Ambil password hash lama dari DB
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (!rows[0]) return res.status(404).json({ message: 'User tidak ditemukan' });

    // Cek old password
    const isMatch = await comparePassword(oldPassword, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Password lama salah' });

    // Hash password baru
    const newHashed = await hashPassword(newPassword);

    // Update password di DB
    const updateRes = await db.query(
      'UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id, nama, email, role, created_at',
      [newHashed, userId]
    );

    res.json({
      status: 'success',
      message: 'Password berhasil diubah',
      data: updateRes.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { updatePassword };
