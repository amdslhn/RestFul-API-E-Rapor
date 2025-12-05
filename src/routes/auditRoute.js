const express = require('express');
const router = express.Router();
const { listAudit } = require('../controllers/auditController');
const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');

router.get('/', authenticate, allowRoles('admin'), auditLog, listAudit);


module.exports = router;
