import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import passwordsRouter from './routes/passwords.js';


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const app = express();
const port = process.env.PORT || 5500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'html')));

function verifyToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    if (req.path.startsWith('/passwords')) {
      return res.status(401).json({ error: 'Bitte zuerst einloggen' });
    }
    return res.redirect('/login.html');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    if (req.path.startsWith('/passwords')) {
      return res.status(401).json({ error: 'Die Sitzung ist abgelaufen, bitte erneut einloggen' });
    }
    return res.redirect('/login.html');
  }
}

app.use('/passwords', verifyToken, passwordsRouter);


app.get('/', (req, res) => {
  const token = req.cookies?.token;
  let loggedIn = false;

  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      loggedIn = true;
    } catch {
      loggedIn = false;
    }
  }

  res.cookie('loggedIn', loggedIn, { httpOnly: false, sameSite: 'lax', path: '/' });
  return res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

app.get('/login', (req, res) => {
  res.cookie('loggedIn', false, { httpOnly: false, sameSite: 'lax', path: '/' });
  return res.sendFile(path.join(__dirname, 'html', 'login.html'));
});

app.get('/register', (req, res) => {
  res.cookie('loggedIn', false, { httpOnly: false, sameSite: 'lax', path: '/' });
  return res.sendFile(path.join(__dirname, 'html', 'register.html'));
});


app.post('/auth/register', async (req, res) => {
  const { login, email, password } = req.body;
  if (!login || !email || !password) {
    return res.status(400).json({ error: 'Login, Email und Passwort sind Pflichtfelder' });
  }

  try {
    const existingLogin = await pool.query('SELECT id FROM users WHERE login = $1', [login]);
    if (existingLogin.rows.length > 0) {
      return res.status(400).json({ error: 'Dieser Login ist bereits registriert' });
    }

    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Dieser Email ist bereits registriert' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (login, email, password) VALUES ($1, $2, $3) RETURNING id, login, email',
      [login, email, hashedPassword]
    );
    const newUser = result.rows[0];

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60*60*1000, path: '/' });
    res.cookie('loggedIn', true, { httpOnly: false, sameSite: 'lax', path: '/' });

    return res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email und Passwort eingeben' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Ungültiges Passwort' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60*60*1000, path: '/' });
    res.cookie('loggedIn', true, { httpOnly: false, sameSite: 'lax', path: '/' });

    return res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Loginfehler' });
  }
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.cookie('loggedIn', false, { httpOnly: false, sameSite: 'lax', path: '/' });
  return res.redirect('/login.html');
});


if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server läuft: http://localhost:${port}`);
  });
}

export default app;
