const express = require('express');
const router = express.Router();
const { listUsers, getUserById, updateUser, deleteUser, getAllSiswa, getAllGuru } = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');
const { updatePassword } = require('../controllers/profileController');
router.get('/', authenticate, allowRoles('admin'), auditLog, listUsers);
router.get('/:userId', authenticate, allowRoles('admin'), auditLog, getUserById);
router.put('/:userId', authenticate, allowRoles('admin'), auditLog, updateUser);
router.delete('/:userId', authenticate, allowRoles('admin'), auditLog, deleteUser);
router.get('/siswa/all', authenticate, allowRoles('admin','guru'), auditLog, getAllSiswa);
router.get('/guru/all', authenticate, allowRoles('admin','guru'), auditLog, getAllGuru);
router.get('/kelas/:kelasId', async (req, res, next) => {
  try {
    const { kelasId } = req.params;
    
    // Query: Join tabel users dengan siswa_kelas
    const q = `
      SELECT u.id, u.nama, u.email, u.role
      FROM users u
      JOIN siswa_kelas sk ON sk.siswa_id = u.id
      WHERE sk.kelas_id = $1 AND u.role = 'siswa'
      ORDER BY u.nama ASC
    `;
    
    const { rows } = await db.query(q, [kelasId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.put('/:userId/password', authenticate, updatePassword);
module.exports = router;
