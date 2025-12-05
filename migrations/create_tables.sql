-- =====================================
-- 1. TABEL USERS
-- =====================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'guru', 'siswa')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================
-- 2. TABEL KELAS
-- =====================================
CREATE TABLE IF NOT EXISTS kelas (
    id SERIAL PRIMARY KEY,
    nama_kelas VARCHAR(50) NOT NULL
);

-- =====================================
-- 3. TABEL MAPEL
-- =====================================
CREATE TABLE IF NOT EXISTS mapel (
    id SERIAL PRIMARY KEY,
    nama_mapel VARCHAR(100) NOT NULL
);

-- =====================================
-- 4. FUNCTION VALIDASI ROLE SISWA
-- =====================================
CREATE OR REPLACE FUNCTION is_siswa(user_id INT)
RETURNS BOOLEAN AS $$
    SELECT role = 'siswa' FROM users WHERE id = user_id;
$$ LANGUAGE SQL;

-- =====================================
-- 5. FUNCTION VALIDASI ROLE GURU
-- =====================================
CREATE OR REPLACE FUNCTION is_guru(user_id INT)
RETURNS BOOLEAN AS $$
    SELECT role = 'guru' FROM users WHERE id = user_id;
$$ LANGUAGE SQL;

-- =====================================
-- 6. TABEL GURU_MAPEL_KELAS
-- =====================================
CREATE TABLE IF NOT EXISTS guru_mapel_kelas (
    id SERIAL PRIMARY KEY,
    guru_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mapel_id INTEGER NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
    kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    CONSTRAINT guru_role_check CHECK (is_guru(guru_id))
);

-- =====================================
-- 7. TABEL SISWA_KELAS
-- =====================================
CREATE TABLE IF NOT EXISTS siswa_kelas (
    id SERIAL PRIMARY KEY,
    siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    CONSTRAINT siswa_role_check CHECK (is_siswa(siswa_id))
);

-- =====================================
-- 8. TABEL NILAI
-- =====================================
CREATE TABLE IF NOT EXISTS nilai (
    id SERIAL PRIMARY KEY,
    siswa_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mapel_id INTEGER NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
    guru_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nilai_angka NUMERIC(5,2) NOT NULL,
    semester INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT nilai_siswa_role_check CHECK (is_siswa(siswa_id)),
    CONSTRAINT nilai_guru_role_check CHECK (is_guru(guru_id))
);

-- =====================================
-- 9. TABEL AUDIT_LOG
-- =====================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(200) NOT NULL,
    method VARCHAR(10),
    endpoint VARCHAR(200),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
