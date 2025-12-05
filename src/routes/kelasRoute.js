const express = require('express');
const router = express.Router();
const {
  createKelas, listKelas, getKelasById, updateKelas, deleteKelas, addSiswaToKelas, listSiswaByKelas,
  removeSiswaFromKelas,
  getKelasByGuruId
} = require('../controllers/kelasController');

const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');

router.post('/', authenticate, allowRoles('admin'), auditLog, createKelas);
router.get('/', authenticate, allowRoles('admin','guru'), auditLog, listKelas);
router.get('/:kelasId', authenticate, allowRoles('admin','guru'), auditLog, getKelasById);
router.put('/:kelasId', authenticate, allowRoles('admin'), auditLog, updateKelas);
router.delete('/:kelasId', authenticate, allowRoles('admin'), auditLog, deleteKelas);
router.post('/:kelasId/siswa/:siswaId', authenticate, allowRoles('admin'), auditLog, addSiswaToKelas);
router.get('/:kelasId/siswa', authenticate, allowRoles('admin','guru'), auditLog, listSiswaByKelas);
router.delete('/:kelasId/siswa/:siswaId', authenticate, allowRoles('admin'), auditLog, removeSiswaFromKelas);
router.get('/guru/:guruId', authenticate, allowRoles('admin','guru'), auditLog, getKelasByGuruId);

module.exports = router;
