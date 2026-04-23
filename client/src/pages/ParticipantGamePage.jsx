import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParticipantSocket, disconnectParticipantSocket } from '../socket.js';
import { playBuzz, playDing, playTimerEnd } from '../sounds.js';

export default function ParticipantGamePage() {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const storedParticipant = JSON.parse(sessionStorage.getItem('participant') || 'null');
  const initialSnapshot = JSON.parse(sessionStorage.getItem('snapshot') || 'null');

  const [participant] = useState(storedParticipant);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [buzzed, setBuzzed] = useState(false);
  const [myRank, setMyRank] = useState(null);
  const [kicked, setKicked] = useState(false);
  const [timer, setTimer] = useState(null); // { teamName, participantId, remaining }
  const timerRef = useRef(null);

  useEffect(() => {
    if (!participant) {
      navigate('/join');
      return;
    }

    const socket = getParticipantSocket();
    socketRef.current = socket;

    if (!socket.connected) socket.connect();

    socket.on('room:state', (data) => setSnapshot(data));

    socket.on('buzzers:opened', () => {
      setBuzzed(false);
      setMyRank(null);
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'open', rankings: [], selectedTeam: null } : prev);
      playDing();
    });

    socket.on('buzzers:closed', () => {
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'closed' } : prev);
    });

    socket.on('buzzers:reset', () => {
      setBuzzed(false);
      setMyRank(null);
      clearTimer();
      setSnapshot(prev => prev ? { ...prev, buzzerState: 'open', rankings: [], selectedTeam: null } : prev);
      playDing();
    });

    socket.on('buzz:ranking', ({ rankings }) => {
      setSnapshot(prev => prev ? { ...prev, rankings } : prev);
      const myEntry = rankings.find(r => r.participantId === participant.id);
      if (myEntry) {
        setMyRank(rankings.indexOf(myEntry) + 1);
        setBuzzed(true);
      }
    });

    socket.on('answer:timer:start', ({ participantId, teamName, duration }) => {
      playDing();
      startTimer(participantId, teamName, Math.ceil(duration / 1000));
      setSnapshot(prev => prev ? { ...prev, selectedTeam: participantId, buzzerState: 'closed' } : prev);
    });

    socket.on('answer:timer:end', () => {
      playTimerEnd();
      clearTimer();
      setSnapshot(prev => prev ? { ...prev, selectedTeam: null } : prev);
    });

    socket.on('participant:kicked', () => {
      setKicked(true);
      clearTimer();
      disconnectParticipantSocket();
    });

    socket.on('points:updated', ({ participants }) => {
      setSnapshot(prev => prev ? { ...prev, participants } : prev);
    });

    return () => {
      socket.off('room:state');
      socket.off('buzzers:opened');
      socket.off('buzzers:closed');
      socket.off('buzzers:reset');
      socket.off('buzz:ranking');
      socket.off('answer:timer:start');
      socket.off('answer:timer:end');
      socket.off('participant:kicked');
      socket.off('points:updated');
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

  function handleBuzz() {
    if (!buzzed && snapshot?.buzzerState === 'open' && !timer) {
      socketRef.current?.emit('buzz:in');
      setBuzzed(true);
      playBuzz();
    }
  }

  if (kicked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">You've been removed</h1>
          <p className="text-slate-500 mb-6">The teacher has removed you from the game.</p>
          <a href="/join" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Rejoin</a>
        </div>
      </div>
    );
  }

  if (!participant || !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-slate-500">Loading...</div>
      </div>
    );
  }

  const isMyTurn = snapshot.selectedTeam === participant.id;
  const someoneElseTurn = snapshot.selectedTeam && snapshot.selectedTeam !== participant.id;
  const buzzerOpen = snapshot.buzzerState === 'open';

  const myParticipant = (snapshot.participants || []).find(p => p.id === participant.id);
  const myPoints = myParticipant?.points ?? 0;
  const leaderboard = [...(snapshot.participants || [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  const timerColor = timer
    ? timer.remaining > 3 ? 'text-green-500' : timer.remaining > 1 ? 'text-yellow-500' : 'text-red-500'
    : 'text-slate-900';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-800">{participant.teamName}</span>
          <span className="text-slate-400 text-sm ml-2">· {snapshot.room?.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold tabular-nums ${
            myPoints > 0 ? 'text-green-600' : myPoints < 0 ? 'text-red-500' : 'text-slate-400'
          }`}>
            {myPoints} pts
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            buzzerOpen ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {buzzerOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 py-4 gap-4">
        {/* Timer banner */}
        {timer && (
          <div className={`w-full rounded-2xl p-4 text-center ${
            isMyTurn ? 'bg-blue-600 text-white' : 'bg-slate-100'
          }`}>
            <p className={`text-sm font-semibold mb-1 ${
              isMyTurn ? 'text-blue-200' : 'text-slate-500'
            }`}>
              {isMyTurn ? '🎤 YOUR TURN!' : `${timer.teamName} is answering...`}
            </p>
            <div className={`text-6xl font-mono font-bold ${isMyTurn ? 'text-white' : timerColor}`}>
              {timer.remaining}
            </div>
          </div>
        )}

        {/* Buzz rank feedback */}
        {myRank && !timer && (
          <div className={`w-full rounded-2xl p-4 text-center ${
            myRank === 1
              ? 'bg-yellow-50 border-2 border-yellow-400'
              : 'bg-slate-50 border border-slate-200'
          }`}>
            <p className="text-sm text-slate-500">You buzzed in</p>
            <p className={`text-4xl font-bold ${myRank === 1 ? 'text-yellow-600' : 'text-slate-700'}`}>
              #{myRank}
            </p>
          </div>
        )}

        {/* BUZZ button — takes up most of screen */}
        <button
          onClick={handleBuzz}
          disabled={!buzzerOpen || buzzed || !!timer}
          className={`
            w-full rounded-3xl font-black text-4xl transition-all select-none flex-1
            ${buzzerOpen && !buzzed && !timer
              ? 'bg-red-500 hover:bg-red-400 active:scale-95 text-white shadow-2xl shadow-red-200 animate-pulse'
              : buzzed
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
          style={{ minHeight: '55vh' }}
        >
          {buzzed
            ? (buzzerOpen ? '✓ BUZZED' : 'BUZZED')
            : buzzerOpen
              ? 'BUZZ!'
              : 'WAITING...'}
        </button>

        {/* Rankings list */}
        {snapshot.rankings && snapshot.rankings.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Buzz Order</p>
            <ul className="space-y-1">
              {snapshot.rankings.map((r, i) => (
                <li
                  key={r.participantId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    r.participantId === participant.id
                      ? 'bg-blue-50 font-bold text-blue-700'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>#{i + 1} {r.teamName}{r.participantId === participant.id ? ' (you)' : ''}</span>
                  <span className="font-mono text-xs">+{(r.delta / 1000).toFixed(2)}s</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Scoreboard</p>
            <ul className="space-y-1">
              {leaderboard.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    p.id === participant.id
                      ? 'bg-blue-50 font-bold text-blue-700 border border-blue-200'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>#{i + 1} {p.teamName}{p.id === participant.id ? ' (you)' : ''}</span>
                  <span className={`font-mono text-xs font-bold tabular-nums ${
                    p.points > 0 ? 'text-green-600' : p.points < 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {p.points ?? 0} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
