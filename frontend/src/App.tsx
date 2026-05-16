import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import TeacherManager from './pages/TeacherManager';
import QuestionSetup from './pages/QuestionSetup';
import ExamUpload from './pages/ExamUpload';
import GradingStudio from './pages/GradingStudio';
import ReviewQueue from './pages/ReviewQueue';
import StudentReport from './pages/StudentReport';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAppStore } from './store/useAppStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/teacher-manager" element={
          <ProtectedRoute>
            <TeacherManager />
          </ProtectedRoute>
        } />

        <Route path="/teacher-manager/exam/:examId/questions" element={
          <ProtectedRoute>
            <QuestionSetup />
          </ProtectedRoute>
        } />

        <Route path="/teacher-manager/exam/:examId/upload" element={
          <ProtectedRoute>
            <ExamUpload />
          </ProtectedRoute>
        } />

        <Route path="/teacher-manager/exam/:examId/review" element={
          <ProtectedRoute>
            <ReviewQueue />
          </ProtectedRoute>
        } />

        <Route path="/grading/:submissionId" element={
          <ProtectedRoute>
            <GradingStudio />
          </ProtectedRoute>
        } />

        <Route path="/report/:submissionId" element={
          <ProtectedRoute>
            <StudentReport />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
