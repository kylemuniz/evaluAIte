import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';
import NewAssignment from './pages/NewAssignment';
import AssignmentDetail from './pages/AssignmentDetail';
import ManualGrade from './pages/ManualGrade';
import ReviewEssay from './pages/ReviewEssay';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/classes/:classId" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
          <Route path="/assignments/new" element={<ProtectedRoute><NewAssignment /></ProtectedRoute>} />
          <Route path="/assignments/:assignmentId" element={<ProtectedRoute><AssignmentDetail /></ProtectedRoute>} />
          <Route path="/assignments/:assignmentId/essays/:essayId/grade" element={<ProtectedRoute><ManualGrade /></ProtectedRoute>} />
          <Route path="/assignments/:assignmentId/essays/:essayId/review" element={<ProtectedRoute><ReviewEssay /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
