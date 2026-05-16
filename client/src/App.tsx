import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TeamProgressPage from './pages/TeamProgressPage';
import CreateTodoPage from './pages/CreateTodoPage';
import MyTasksPage from './pages/MyTasksPage';
import AttendancePage from './pages/AttendancePage';
import ApplyLeavePage from './pages/ApplyLeavePage';
import ProjectsPage from './pages/ProjectsPage';

export default function App() {
  const { user } = useAuthStore();
  const isAuth = !!user;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={isAuth ? <Navigate to="/dashboard" replace /> : <AuthPage />} />

      {/* Protected — wrapped in AppShell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/apply-leave"
            element={<ApplyLeavePage />}
          />

          {/* PL + QR only */}
          <Route
            path="/team-progress"
            element={
              user?.role === 'TASKER' ? <Navigate to="/dashboard" replace /> : <TeamProgressPage />
            }
          />

          {/* PL only */}
          <Route
            path="/create-todo"
            element={
              user?.role !== 'PROJECT_LEAD' ? <Navigate to="/dashboard" replace /> : <CreateTodoPage />
            }
          />
          <Route
            path="/projects"
            element={
              user?.role !== 'PROJECT_LEAD' ? <Navigate to="/dashboard" replace /> : <ProjectsPage />
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuth ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}
