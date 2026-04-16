import { Router } from 'express';
import { randomBytes } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();

function randomCode() {
  return randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9C2"
}

// Get teacher's active room
router.get('/active', requireAuth, (req, res) => {
  const db = getDb();
  const room = db.prepare(
    `SELECT * FROM rooms WHERE teacher_id = ? AND status != 'closed' ORDER BY created_at DESC LIMIT 1`
  ).get(req.teacher.teacherId);
  if (!room) return res.json({ room: null });
  const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(room.id);
  res.json({ room, participants });
});

// Create a new room
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  // Close any existing active rooms
  db.prepare(`UPDATE rooms SET status = 'closed' WHERE teacher_id = ? AND status != 'closed'`).run(req.teacher.teacherId);

  let code;
  let attempts = 0;
  do {
    code = randomCode();
    attempts++;
  } while (db.prepare('SELECT id FROM rooms WHERE code = ?').get(code) && attempts < 10);

  const result = db.prepare(
    'INSERT INTO rooms (code, teacher_id, status, buzzer_state, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(code, req.teacher.teacherId, 'waiting', 'closed', Date.now());

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  res.json({ room });
});

// End a room
router.delete('/:code', requireAuth, (req, res) => {
  const db = getDb();
  const room = db.prepare('SELECT * FROM rooms WHERE code = ? AND teacher_id = ?').get(
    req.params.code, req.teacher.teacherId
  );
  if (!room) return res.status(404).json({ error: 'Room not found' });
  db.prepare('DELETE FROM participants WHERE room_id = ?').run(room.id);
  db.prepare(`UPDATE rooms SET status = 'closed' WHERE id = ?`).run(room.id);
  res.json({ ok: true });
});

export default router;
