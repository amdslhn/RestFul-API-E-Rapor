const express = require('express');
const router = express.Router();
const { createNilai, updateNilai, listNilai, getNilaiByKelas, getNilaiBySiswa, handleGetNilaiByKelas } = require('../controllers/nilaiController');
const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');

router.post('/siswa/:siswaId/mapel/:mapelId/semester/:semester', authenticate, allowRoles('guru'), auditLog, createNilai);
router.put('/:nilaiId', authenticate, allowRoles('guru'), auditLog, updateNilai);
router.get('/', authenticate, allowRoles('admin'), auditLog, listNilai);
router.get('/siswa/:siswaId/semester/:semester', authenticate, allowRoles('admin','guru'), auditLog, listNilai);
router.get('/semester/:semester', authenticate, allowRoles('siswa'), auditLog, listNilai);
router.get('/kelas/:kelasId/nilai', authenticate, auditLog, handleGetNilaiByKelas);
router.get('/siswa/:siswaId', authenticate, allowRoles('admin','guru','siswa'), auditLog, getNilaiBySiswa);

module.exports = router;
