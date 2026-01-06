import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { AuthProvider } from './contexts/AuthContext';
import NavigationBar from './components/common/NavigationBar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

// Lazy load route components for code splitting
const Login = lazy(() => import('./components/auth/Login'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const TeamsPage = lazy(() => import('./components/teams/TeamsPage'));
const VehiclesPage = lazy(() => import('./components/vehicles/VehiclesPage'));

// Loading component
const PageLoader = () => (
  <div className="minimalist-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavigationBar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <TeamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <VehiclesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
