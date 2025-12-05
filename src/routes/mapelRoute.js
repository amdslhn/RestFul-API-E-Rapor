const express = require('express');
const router = express.Router();
const { createMapel, listMapel, getMapelById, deleteMapel, updateMapel } = require('../controllers/mapelController');
const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');

router.post('/', authenticate, allowRoles('admin'), auditLog, createMapel);
router.get('/', authenticate, allowRoles('admin','guru','siswa'), auditLog, listMapel);
router.get('/:mapelId', authenticate, allowRoles('admin','guru','siswa'), auditLog, getMapelById);
router.put('/:mapelId', authenticate, allowRoles('admin'), auditLog, updateMapel);
router.delete('/:mapelId', authenticate, allowRoles('admin'), auditLog, deleteMapel);

module.exports = router;
