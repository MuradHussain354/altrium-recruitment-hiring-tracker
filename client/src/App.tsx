import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import PublicLayout from './components/layout/PublicLayout';
import PortalLayout from './components/layout/PortalLayout';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import ManagerHomePage from './pages/ManagerHomePage';
import HRHomePage from './pages/HRHomePage';
import TeamLeadHomePage from './pages/TeamLeadHomePage';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PortalLayout />}>
          {/* Manager Protected Area */}
          <Route element={<RoleRoute allowedRoles={['Manager']} />}>
            <Route path="/manager" element={<ManagerHomePage />} />
            <Route path="/manager/*" element={<ManagerHomePage />} />
          </Route>

          {/* HR Protected Area */}
          <Route element={<RoleRoute allowedRoles={['HR']} />}>
            <Route path="/hr" element={<HRHomePage />} />
            <Route path="/hr/*" element={<HRHomePage />} />
          </Route>

          {/* TeamLead Protected Area */}
          <Route element={<RoleRoute allowedRoles={['TeamLead']} />}>
            <Route path="/team-lead" element={<TeamLeadHomePage />} />
            <Route path="/team-lead/*" element={<TeamLeadHomePage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-All 404 Route */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
