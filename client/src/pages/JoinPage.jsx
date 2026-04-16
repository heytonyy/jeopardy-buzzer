import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParticipantSocket } from '../socket.js';

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!roomCode.trim() || !teamName.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);

    const socket = getParticipantSocket();
    socket.connect();

    function onConnect() {
      socket.emit('join:room', { roomCode: roomCode.trim().toUpperCase(), teamName: teamName.trim() }, (response) => {
        setLoading(false);
        if (response.error) {
          setError(response.error);
          socket.disconnect();
          return;
        }
        sessionStorage.setItem('participant', JSON.stringify(response.participant));
        sessionStorage.setItem('snapshot', JSON.stringify(response.snapshot));
        navigate('/play');
      });
    }

    if (socket.connected) {
      onConnect();
    } else {
      socket.once('connect', onConnect);
      socket.once('connect_error', () => {
        setLoading(false);
        setError('Could not connect to server. Is it running?');
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎯</div>
          <h1 className="text-3xl font-bold text-slate-900">Join Game</h1>
          <p className="text-slate-500 mt-1">Enter your room code and team name</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-lg font-mono text-center tracking-widest outline-none transition-colors"
              placeholder="ABC123"
              maxLength={6}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-lg outline-none transition-colors"
              placeholder="Team Rocket"
              maxLength={30}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {loading ? 'Joining...' : 'Join Game →'}
          </button>
        </form>
        <p className="text-slate-400 text-xs text-center mt-6">
          Teacher?{' '}
          <a href="/login" className="text-blue-500 hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  );
}
