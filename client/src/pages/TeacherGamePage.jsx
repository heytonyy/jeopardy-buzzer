import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTeacherSocket, disconnectTeacherSocket } from '../socket.js';
import { playDing, playTimerEnd } from '../sounds.js';
import api from '../api.js';

export default function TeacherGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState(null);
  const [timer, setTimer] = useState(null); // { teamName, participantId, remaining }
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  const roomFromState = location.state?.room;

  useEffect(() => {
    const socket = getTeacherSocket();
    socketRef.current = socket;
    socket.connect();

    if (roomFromState) {
      socket.once('connect', () => {
        socket.emit('teacher:join', roomFromState.code);
      });
      // If already connected
      if (socket.connected) {
        socket.emit('teacher:join', roomFromState.code);
      }
    }

    socket.on('room:state', (data) => setSnapshot(data));

    socket.on('buzzers:opened', () => {
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'open', rankings: [], selectedTeam: null } : prev);
    });

    socket.on('buzzers:closed', () => {
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'closed' } : prev);
    });

    socket.on('buzzers:reset', () => {
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'open', rankings: [], selectedTeam: null } : prev);
      clearTimer();
    });

    socket.on('buzz:ranking', ({ rankings }) => {
      setSnapshot(prev => prev ? { ...prev, rankings } : prev);
    });

    socket.on('answer:timer:start', ({ participantId, teamName, duration }) => {
      playDing();
      startTimer(participantId, teamName, Math.ceil(duration / 1000));
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'closed', selectedTeam: participantId } : prev);
    });

    socket.on('answer:timer:end', () => {
      playTimerEnd();
      clearTimer();
      setSnapshot(prev => prev ? { ...prev, selectedTeam: null } : prev);
    });

    return () => {
      socket.off('room:state');
      socket.off('buzzers:opened');
      socket.off('buzzers:closed');
      socket.off('buzzers:reset');
      socket.off('buzz:ranking');
      socket.off('answer:timer:start');
      socket.off('answer:timer:end');
      disconnectTeacherSocket();
    };
  }, []);

  function startTimer(participantId, teamName, seconds) {
    clearTimer();
    setTimer({ participantId, teamName, remaining: seconds });
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null;
        const next = prev.remaining - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          return null;
        }
        return { ...prev, remaining: next };
      });
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimer(null);
  }

  async function endRoom() {
    if (!snapshot?.room?.code) return;
    if (!confirm('End this room? All participants will be disconnected.')) return;
    try {
      await api.delete(`/rooms/${snapshot.room.code}`);
      navigate('/dashboard');
    } catch {
      alert('Failed to end room');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    disconnectTeacherSocket();
    navigate('/login');
  }

  const socket = socketRef.current;

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-white text-xl">Connecting...</div>
      </div>
    );
  }

  const { room, participants, buzzerState, rankings, selectedTeam } = snapshot;
  const buzzedIds = new Set((rankings || []).map(r => r.participantId));
  const notBuzzed = (participants || []).filter(p => !buzzedIds.has(p.id));

  const timerColor = timer
    ? timer.remaining > 3 ? 'text-green-400' : timer.remaining > 1 ? 'text-yellow-400' : 'text-red-400'
    : 'text-white';

  return (
    <div className="min-h-screen text-white" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold">🎯 Jeopardy Buzzer</span>
          <span className="text-slate-400 text-sm">Teacher View</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={endRoom}
            className="text-sm bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
          >
            End Room
          </button>
          <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left column: Room info + controls + participants */}
        <div className="col-span-1 space-y-4">
          {/* Room code */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Room Code</p>
            <div className="text-5xl font-mono font-bold text-blue-400 tracking-widest text-center py-2">
              {room?.code}
            </div>
          </div>

          {/* Buzzer controls */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Buzzer Control</p>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${buzzerState === 'open' ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className={`font-bold ${buzzerState === 'open' ? 'text-green-400' : 'text-slate-400'}`}>
                {buzzerState === 'open' ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => socket?.emit('teacher:open')}
                disabled={buzzerState === 'open'}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
              >
                OPEN BUZZERS
              </button>
              <button
                onClick={() => socket?.emit('teacher:reset')}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
              >
                RESET BUZZERS
              </button>
              <button
                onClick={() => socket?.emit('teacher:close')}
                disabled={buzzerState === 'closed'}
                className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
              >
                CLOSE BUZZERS
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">
              Teams ({(participants || []).length})
            </p>
            {!participants || participants.length === 0 ? (
              <p className="text-slate-500 text-sm">Waiting for participants...</p>
            ) : (
              <ul className="space-y-2">
                {participants.map(p => (
                  <li key={p.id} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{p.teamName}</span>
                    <button
                      onClick={() => socket?.emit('teacher:kick', { participantId: p.id })}
                      className="text-slate-400 hover:text-red-400 text-xs transition-colors"
                    >
                      Kick
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right columns: Timer + Rankings */}
        <div className="col-span-2 space-y-4">
          {/* Active timer */}
          {timer && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-blue-500 text-center">
              <p className="text-blue-400 text-sm uppercase tracking-wider mb-1">Answering</p>
              <p className="text-xl font-bold text-white mb-3">{timer.teamName}</p>
              <div className={`text-8xl font-mono font-bold ${timerColor} transition-colors`}>
                {timer.remaining}
              </div>
            </div>
          )}

          {/* Buzz rankings */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">Buzz Rankings</p>
            {!rankings || rankings.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {buzzerState === 'open'
                  ? 'Buzzers are open — waiting for buzz-ins...'
                  : 'Open buzzers to start accepting buzz-ins.'}
              </p>
            ) : (
              <ul className="space-y-2 mb-4">
                {rankings.map((r, i) => (
                  <li
                    key={r.participantId}
                    onClick={() => socket?.emit('teacher:select', { participantId: r.participantId })}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                      selectedTeam === r.participantId
                        ? 'bg-blue-600 border border-blue-400'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold w-8 ${
                        i === 0 ? 'text-yellow-400' :
                        i === 1 ? 'text-slate-300' :
                        i === 2 ? 'text-orange-400' : 'text-slate-400'
                      }`}>
                        #{i + 1}
                      </span>
                      <span className="font-semibold">{r.teamName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-300 font-mono text-sm">
                        +{(r.delta / 1000).toFixed(2)}s
                      </span>
                      {selectedTeam !== r.participantId && (
                        <div className="text-xs text-blue-400 mt-0.5">Click to select</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Teams that haven't buzzed */}
            {notBuzzed.length > 0 && rankings && rankings.length > 0 && (
              <>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Not buzzed</p>
                <ul className="space-y-1">
                  {notBuzzed.map(p => (
                    <li key={p.id} className="text-slate-500 text-sm px-4 py-2 bg-slate-700/50 rounded-lg">
                      {p.teamName}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
