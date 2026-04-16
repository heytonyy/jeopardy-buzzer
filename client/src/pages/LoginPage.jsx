import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('username', data.username); // non-sensitive, used for display only
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-white">Jeopardy Buzzer</h1>
          <p className="text-slate-400 text-sm mt-1">Teacher Login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:border-blue-400"
              placeholder="teacher"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:border-blue-400"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-slate-500 text-xs text-center mt-6">
          Students: go to <span className="text-blue-400">/join</span>
        </p>
      </div>
    </div>
  );
}
