import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // The real auth is the httpOnly cookie — username is a non-sensitive display hint
  const username = localStorage.getItem('username');
  if (!username) return <Navigate to="/login" replace />;
  return children;
}
