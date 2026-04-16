import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

function parseTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// In-memory game state per room
// roomState[roomCode] = {
//   buzzerState: 'closed' | 'open',
//   buzzerOpenedAt: timestamp | null,
//   rankings: [{ participantId, teamName, buzzedAt, delta }],
//   selectedTeam: participantId | null,
//   timerInterval: NodeJS.Timeout | null,
// }
const roomState = new Map();

function getOrInitRoomState(code) {
  if (!roomState.has(code)) {
    roomState.set(code, {
      buzzerState: 'closed',
      buzzerOpenedAt: null,
      rankings: [],
      selectedTeam: null,
      timerInterval: null,
    });
  }
  return roomState.get(code);
}

function buildRoomSnapshot(room, participants, state) {
  return {
    room: {
      id: room.id,
      code: room.code,
      displayName: room.display_name,
      status: room.status,
    },
    buzzerState: state.buzzerState,
    rankings: state.rankings,
    selectedTeam: state.selectedTeam,
    participants: participants.map(p => ({
      id: p.id,
      teamName: p.team_name,
      socketId: p.socket_id,
    })),
  };
}

export function registerSocketHandlers(io) {
  const teacherNs = io.of('/teacher');
  const participantNs = io.of('/participant');

  // Teacher auth middleware — reads JWT from httpOnly cookie
  teacherNs.use((socket, next) => {
    const token = parseTokenFromCookie(socket.handshake.headers.cookie);
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.teacher = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  teacherNs.on('connection', (socket) => {
    const teacherId = socket.teacher.teacherId;
    console.log(`Teacher connected: ${socket.id}`);

    function getActiveRoom() {
      const db = getDb();
      return db.prepare(
        `SELECT * FROM rooms WHERE teacher_id = ? AND status != 'closed' ORDER BY created_at DESC LIMIT 1`
      ).get(teacherId);
    }

    function broadcastToRoom(roomCode, event, data) {
      teacherNs.to(`room:${roomCode}`).emit(event, data);
      participantNs.to(`room:${roomCode}`).emit(event, data);
    }

    // Auto-join room on connect
    const room = getActiveRoom();
    if (room) {
      socket.join(`room:${room.code}`);
      socket.currentRoomCode = room.code;
      const db = getDb();
      const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(room.id);
      const state = getOrInitRoomState(room.code);
      socket.emit('room:state', buildRoomSnapshot(room, participants, state));
    }

    // teacher:join — teacher explicitly joins a room (e.g. after page refresh)
    socket.on('teacher:join', (roomCode) => {
      const db = getDb();
      const r = db.prepare('SELECT * FROM rooms WHERE code = ? AND teacher_id = ?').get(roomCode, teacherId);
      if (!r) return; // Room not found or belongs to a different teacher
      socket.join(`room:${roomCode}`);
      socket.currentRoomCode = roomCode;
      const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(r.id);
      const state = getOrInitRoomState(roomCode);
      socket.emit('room:state', buildRoomSnapshot(r, participants, state));
    });

    // teacher:open — open buzzers
    socket.on('teacher:open', () => {
      const r = getActiveRoom();
      if (!r) return;
      const state = getOrInitRoomState(r.code);
      state.buzzerState = 'open';
      state.buzzerOpenedAt = Date.now();
      state.rankings = [];
      state.selectedTeam = null;
      broadcastToRoom(r.code, 'buzzers:opened', { openedAt: state.buzzerOpenedAt });
    });

    // teacher:close — close buzzers
    socket.on('teacher:close', () => {
      const r = getActiveRoom();
      if (!r) return;
      const state = getOrInitRoomState(r.code);
      state.buzzerState = 'closed';
      broadcastToRoom(r.code, 'buzzers:closed', {});
    });

    // teacher:reset — clear rankings and re-open buzzers
    socket.on('teacher:reset', () => {
      const r = getActiveRoom();
      if (!r) return;
      const state = getOrInitRoomState(r.code);
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
      }
      state.buzzerState = 'open';
      state.buzzerOpenedAt = Date.now();
      state.rankings = [];
      state.selectedTeam = null;
      broadcastToRoom(r.code, 'buzzers:reset', { openedAt: state.buzzerOpenedAt });
    });

    // teacher:select — select a team to answer, starts 5s timer
    socket.on('teacher:select', ({ participantId }) => {
      const r = getActiveRoom();
      if (!r) return;
      const db = getDb();
      const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
      if (!participant) return;

      const state = getOrInitRoomState(r.code);
      state.selectedTeam = participantId;
      state.buzzerState = 'closed';

      if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
      }

      const startedAt = Date.now();
      broadcastToRoom(r.code, 'answer:timer:start', {
        participantId,
        teamName: participant.team_name,
        duration: 5000,
        startedAt,
      });

      let remaining = 5;
      state.timerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(state.timerInterval);
          state.timerInterval = null;
          state.selectedTeam = null;
          broadcastToRoom(r.code, 'answer:timer:end', {});
        }
      }, 1000);
    });

    // teacher:kick — remove a participant
    socket.on('teacher:kick', ({ participantId }) => {
      const r = getActiveRoom();
      if (!r) return;
      const db = getDb();
      const participant = db.prepare('SELECT * FROM participants WHERE id = ? AND room_id = ?').get(
        participantId, r.id
      );
      if (!participant) return;

      if (participant.socket_id) {
        participantNs.to(participant.socket_id).emit('participant:kicked', {});
      }

      db.prepare('DELETE FROM participants WHERE id = ?').run(participantId);

      const state = getOrInitRoomState(r.code);
      state.rankings = state.rankings.filter(rx => rx.participantId !== participantId);

      const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(r.id);
      broadcastToRoom(r.code, 'room:state', buildRoomSnapshot(r, participants, state));
    });

    socket.on('disconnect', () => {
      console.log(`Teacher disconnected: ${socket.id}`);
    });
  });

  participantNs.on('connection', (socket) => {
    console.log(`Participant connected: ${socket.id}`);

    // join:room — participant joins with roomCode + teamName
    socket.on('join:room', ({ roomCode, teamName }, callback) => {
      const db = getDb();
      const room = db.prepare(
        `SELECT * FROM rooms WHERE code = ? AND status != 'closed'`
      ).get(roomCode);
      if (!room) return callback({ error: 'Room not found or closed' });

      if (!teamName || teamName.trim().length === 0) return callback({ error: 'Team name required' });
      const sanitizedName = teamName.trim().slice(0, 30);

      // Check for existing participant with same name (reconnect support)
      let participant = db.prepare(
        'SELECT * FROM participants WHERE room_id = ? AND team_name = ?'
      ).get(room.id, sanitizedName);

      if (participant) {
        // Reconnect: update socket_id
        db.prepare('UPDATE participants SET socket_id = ? WHERE id = ?').run(socket.id, participant.id);
        participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participant.id);
      } else {
        const result = db.prepare(
          'INSERT INTO participants (room_id, team_name, socket_id) VALUES (?, ?, ?)'
        ).run(room.id, sanitizedName, socket.id);
        participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid);
      }

      socket.participantId = participant.id;
      socket.roomCode = roomCode;
      socket.join(`room:${roomCode}`);

      const state = getOrInitRoomState(roomCode);
      const participants = db.prepare('SELECT * FROM participants WHERE room_id = ?').all(room.id);
      const snapshot = buildRoomSnapshot(room, participants, state);

      // Broadcast updated participant list to teacher
      teacherNs.to(`room:${roomCode}`).emit('room:state', snapshot);

      callback({ ok: true, participant: { id: participant.id, teamName: participant.team_name }, snapshot });
    });

    // buzz:in — participant buzzes in
    socket.on('buzz:in', () => {
      if (!socket.participantId || !socket.roomCode) return;
      const db = getDb();
      const room = db.prepare(
        `SELECT * FROM rooms WHERE code = ? AND status != 'closed'`
      ).get(socket.roomCode);
      if (!room) return;

      const state = getOrInitRoomState(socket.roomCode);
      if (state.buzzerState !== 'open') return;
      if (state.rankings.find(r => r.participantId === socket.participantId)) return;

      const now = Date.now();
      const delta = now - state.buzzerOpenedAt;
      const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(socket.participantId);
      if (!participant) return;

      state.rankings.push({
        participantId: participant.id,
        teamName: participant.team_name,
        buzzedAt: now,
        delta,
      });
      state.rankings.sort((a, b) => a.delta - b.delta);

      teacherNs.to(`room:${socket.roomCode}`).emit('buzz:ranking', { rankings: state.rankings });
      participantNs.to(`room:${socket.roomCode}`).emit('buzz:ranking', { rankings: state.rankings });
    });

    socket.on('disconnect', () => {
      console.log(`Participant disconnected: ${socket.id}`);
      // Keep in DB for reconnection
    });
  });
}
