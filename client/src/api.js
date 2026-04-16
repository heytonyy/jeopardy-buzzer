import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`,
  withCredentials: true, // send httpOnly cookie on every request
});

export default api;
