const express = require('express');
const router = express.Router();
const { registerUser, login, authMe, register, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { allowRoles } = require('../middlewares/roles');
const { auditLog } = require('../middlewares/audit');

// Admin only register (body: nama,email,password,role)
router.post('/registerUser', authenticate, allowRoles('admin'), auditLog, registerUser);

router.post('/register', register);

// Login open
router.post('/login', login);

router.get('/me', authenticate, auditLog, authMe);

router.post('/logout', authenticate, auditLog, logout);


module.exports = router;
