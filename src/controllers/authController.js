const db = require("../db");
const {
  hashPassword,
  comparePassword,
  signToken,
} = require("../utils/helpers");

async function registerUser(req, res, next) {
  try {
    let { nama, email, password, nisn } = req.body;

    nama = nama?.trim();
    email = email?.trim().toLowerCase();
    nisn = nisn?.trim();

    // ================= VALIDASI =================
    if (!nama || nama.length < 3) {
      return res.status(400).json({ message: "Nama minimal 3 karakter" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Email tidak valid" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }

    if (!nisn || nisn.length !== 10) {
      return res.status(400).json({ message: "NISN harus 10 digit" });
    }

    const passwordHash = await hashPassword(password);

    // ================= INSERT KE DB =================
    const q = `
      INSERT INTO users (nama, email, password_hash, role, nisn)
      VALUES ($1, $2, $3, 'siswa', $4)
      RETURNING id, nama, email, role, nisn, created_at
    `;

    const { rows } = await db.query(q, [nama, email, passwordHash, nisn]);

    res.status(201).json({
      status: "success",
      message: "Siswa berhasil mendaftar",
      user: rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ message: "Email atau NISN sudah digunakan." });
    }
    next(err);
  }
}

async function register(req, res, next) {
  try {
    // 1. Ambil Input (Tambahkan password di sini agar terbaca)
    let { nama, email, role, nip, nisn, password } = req.body;
    nama = nama ? nama.toString().trim() : "";
    email = email ? email.toString().trim().toLowerCase() : "";
    role = role ? role.toString().trim() : "siswa";

    // ================= VALIDASI =================
    if (!nama || nama.length < 3) {
      return res.status(400).json({ message: "Nama minimal 3 karakter" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Email tidak valid" });
    }

    // Validasi NIP/NISN berdasarkan role
    if (role === "guru") {
      if (!nip || nip.toString().trim() === "") {
        return res.status(400).json({ message: "NIP wajib diisi untuk guru" });
      }
      nip = nip.toString().trim();
    }

    if (role === "siswa") {
      if (!nisn || nisn.toString().trim() === "") {
        return res
          .status(400)
          .json({ message: "NISN wajib diisi untuk siswa" });
      }
      nisn = nisn.toString().trim();
    }

    // ================= PASSWORD (DIPERBAIKI) =================
    // Jika ada password di body, pakai itu. Jika tidak, pakai nama.
    const plainPassword = password ? password.toString() : nama;
    const passwordHash = await hashPassword(plainPassword);

    // ================= INSERT KE DATABASE =================
    const q = `
      INSERT INTO users (nama, email, password_hash, role, nip, nisn)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nama, email, role, nip, nisn, created_at
    `;

    const { rows } = await db.query(q, [
      nama,
      email,
      passwordHash,
      role,
      nip || null,
      nisn || null,
    ]);

    // ================= RESPONSE =================
    res.status(201).json({
      status: "success",
      message: "User berhasil didaftarkan",
      data: rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ message: "Email sudah terdaftar, gunakan email lain." });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const q =
      "SELECT id, nama, email, password_hash, role FROM users WHERE email = $1";
    const { rows } = await db.query(q, [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.nama,
    });

    // Kirim token di cookie (DIPERBAIKI AGAR BISA DIBACA BROWSER)
    res.cookie("token", token, {
      httpOnly: false,
      secure: false, // False di local
      sameSite: "Lax", // Strict diganti Lax agar tidak di-block browser saat dev
      maxAge: 5 * 60 * 1000,
    });

    // Kirim data user tanpa token di body (FORMAT TETAP)
    res.json({
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function authMe(req, res, next) {
  try {
    const { id } = req.user; // DARI TOKEN: cuma id & role

    // Ambil full data user dari database
    const q = `
      SELECT id, nama, email, role, nisn, nip
      FROM users
      WHERE id = $1
    `;
    const { rows } = await db.query(q, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const user = rows[0];

    // ===== FORMAT HASIL BERDASARKAN ROLE =====
    const result = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
    };

    if (user.role === "siswa") {
      result.nisn = user.nisn;
    }

    if (user.role === "guru") {
      result.nip = user.nip;
    }

    res.json({ user: result });
  } catch (err) {
    next(err);
  }
}

const logout = (req, res, next) => {
  try {
    // Hapus cookie token
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax", // Sesuaikan dengan login
      maxAge: 0,
      path: "/",
    });

    res.status(200).json({ message: "Logout berhasil" });
  } catch (err) {
    next(err);
  }
};

// EXPORT DIPERBAIKI (HAPUS DUPLIKAT)
module.exports = { register, registerUser, login, authMe, logout };