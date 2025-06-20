import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';

const AppRouter = () => {
  const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';

  return (
    <Router basename="/">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/company-dashboard"
          element={isAuthenticated ? <App key="company-dashboard" dashboardType="company" /> : <Navigate to="/login" />}
        />
        <Route
          path="/worker-dashboard"
          element={isAuthenticated ? <App key="worker-dashboard" dashboardType="worker" /> : <Navigate to="/login" />}
        />
        <Route
          path="/caller-dashboard"
          element={isAuthenticated ? <App key="caller-dashboard" dashboardType="caller" /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin-dashboard"
          element={isAuthenticated ? <App key="admin-dashboard" dashboardType="admin" /> : <Navigate to="/login" />}
        />
        <Route
          path="/*"
          element={isAuthenticated ? <Navigate to="/company-dashboard" /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default AppRouter;