import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TeacherGamePage from './pages/TeacherGamePage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import ParticipantGamePage from './pages/ParticipantGamePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/play" element={<ParticipantGamePage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/teacher/room" element={
        <ProtectedRoute>
          <TeacherGamePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/join" replace />} />
    </Routes>
  );
}
