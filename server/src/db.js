import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db;

export function getDb() {
  return db;
}

export function initDb() {
  db = new Database(path.join(__dirname, '../../data.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER NOT NULL,
      display_name TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      buzzer_state TEXT NOT NULL DEFAULT 'closed',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY,
      room_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      socket_id TEXT,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );
  `);

  // Migrate: add points column if not present (safe on fresh and existing DBs)
  try {
    db.exec(`ALTER TABLE participants ADD COLUMN points INTEGER NOT NULL DEFAULT 0`);
  } catch {}

  // Always upsert teacher credentials from env so config var changes take effect on restart
  const username = process.env.TEACHER_USERNAME;
  const password = process.env.TEACHER_PASSWORD;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO teachers (username, password_hash) VALUES (?, ?)
    ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
  `).run(username, hash);
  console.log(`Teacher account upserted: ${username}`);

  console.log('Database initialized');
}
