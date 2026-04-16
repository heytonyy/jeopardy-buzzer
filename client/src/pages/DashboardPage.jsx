import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function DashboardPage() {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  useEffect(() => {
    api.get('/rooms/active')
      .then(({ data }) => setRoom(data.room))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createRoom() {
    setCreating(true);
    try {
      const { data } = await api.post('/rooms');
      navigate('/teacher/room', { state: { room: data.room } });
    } catch {
      alert('Failed to create room');
    } finally {
      setCreating(false);
    }
  }

  function goToRoom() {
    navigate('/teacher/room', { state: { room } });
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('username');
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🎯 Jeopardy Buzzer</h1>
            <p className="text-slate-400 mt-1">Welcome, {username}</p>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white text-sm transition-colors">
            Sign out
          </button>
        </div>

        {room ? (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">Active Room</h2>
            <div className="text-center py-6">
              <div className="text-6xl font-mono font-bold text-blue-400 tracking-widest mb-2">
                {room.code}
              </div>
              <p className="text-slate-400 text-sm">Room Code</p>
            </div>
            <button
              onClick={goToRoom}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Go to Game Screen →
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center">
            <div className="text-4xl mb-4">🏁</div>
            <h2 className="text-xl font-semibold text-white mb-2">No Active Room</h2>
            <p className="text-slate-400 mb-6 text-sm">Create a new room to start a game session.</p>
            <button
              onClick={createRoom}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              {creating ? 'Creating...' : '+ Create New Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
