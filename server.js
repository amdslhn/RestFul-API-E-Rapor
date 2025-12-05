require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const authRoute = require('./src/routes/authRoute');
const userRoute = require('./src/routes/userRoute');
const kelasRoute = require('./src/routes/kelasRoute');
const mapelRoute = require('./src/routes/mapelRoute');
const nilaiRoute = require('./src/routes/nilaiRoute');
const guruRoute = require('./src/routes/guruRoute');
const auditRoute = require('./src/routes/auditRoute');
const { errorHandler } = require('./src/middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: ["http://localhost:3000","http://192.168.56.1:3000"],// alamat frontend-mu
  credentials: true,  
}))
app.use(helmet());
app.use(bodyParser.json());
app.use(cookieParser());
app.set('trust proxy', true);

// routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/kelas', kelasRoute);
app.use('/api/mapel', mapelRoute);
app.use('/api/nilai', nilaiRoute);
app.use('/api/guru', guruRoute);
app.use('/api/audit', auditRoute);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
