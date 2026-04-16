import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24h
};

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const db = getDb();
    const teacher = db.prepare('SELECT * FROM teachers WHERE username = ?').get(username);
    if (!teacher) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, teacher.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { teacherId: teacher.id, username: teacher.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ username: teacher.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ ok: true });
});

export default router;
