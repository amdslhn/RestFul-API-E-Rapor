const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Validasi email
function isValidEmail(email) {
  return validator.isEmail(email);
}

// Validasi nama minimal 3 karakter
function isValidName(nama) {
  return nama && typeof nama === 'string' && nama.length >= 3;
}

// Validasi role
function isValidRole(role, allowedRoles = ['admin','guru','siswa']) {
  return allowedRoles.includes(role);
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  isValidEmail,
  isValidName,
  isValidRole
};
