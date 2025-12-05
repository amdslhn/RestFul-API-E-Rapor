const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const { auditLog } = require("../middlewares/audit");

const {
  assignGuruToMapelKelas,
  getGuruAssignments,
} = require("../controllers/guruController");

router.post(
  "/:guruId/mapel/:mapelId/kelas/:kelasId",
  authenticate,
  allowRoles("admin"),
  auditLog,
  assignGuruToMapelKelas
);

// Route: Get Guru Assignments (GET)
router.get(
  "/:guruId/mapel-kelas",
  authenticate,
  allowRoles("admin", "guru"),
  auditLog,
  getGuruAssignments
);

module.exports = router;
