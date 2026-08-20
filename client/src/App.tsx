import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import RoleRoute from './auth/RoleRoute';
import PublicLayout from './components/layout/PublicLayout';
import CareersLayout from './components/layout/CareersLayout';
import PortalLayout from './components/layout/PortalLayout';

// Public Careers & Marketing Pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import CareersPage from './pages/public/CareersPage';
import JobDetailPage from './pages/public/JobDetailPage';
import ApplicationPage from './pages/public/ApplicationPage';
import ApplicationSuccessPage from './pages/public/ApplicationSuccessPage';

// Auth & Error Pages
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// Portal Homepages (Placeholders for Manager & TeamLead)
import ManagerHomePage from './pages/ManagerHomePage';
import TeamLeadHomePage from './pages/TeamLeadHomePage';

// HR Portal Pages
import { HRDashboardPage } from './pages/hr/HRDashboardPage';
import { HRPositionsPage } from './pages/hr/HRPositionsPage';
import { HRCreatePositionPage } from './pages/hr/HRCreatePositionPage';
import { HRPositionDetailPage } from './pages/hr/HRPositionDetailPage';
import { HRPipelineEditorPage } from './pages/hr/HRPipelineEditorPage';
import { HRApplicationsPage } from './pages/hr/HRApplicationsPage';
import { HRApplicationDetailPage } from './pages/hr/HRApplicationDetailPage';
import { HRInterviewsPage } from './pages/hr/HRInterviewsPage';

export default function App() {
  return (
    <Routes>
      {/* Public Careers & Marketing Area (with PublicNavbar & PublicFooter) */}
      <Route element={<CareersLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/careers/:positionId" element={<JobDetailPage />} />
        <Route path="/careers/:positionId/apply" element={<ApplicationPage />} />
        <Route path="/application-success" element={<ApplicationSuccessPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Public Auth & System Pages (clean, navbar-free PublicLayout) */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* Protected Portal Area (with PortalLayout & Sidebar) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PortalLayout />}>
          {/* Manager Protected Area */}
          <Route element={<RoleRoute allowedRoles={['Manager']} />}>
            <Route path="/manager" element={<ManagerHomePage />} />
            <Route path="/manager/*" element={<ManagerHomePage />} />
          </Route>

          {/* HR Protected Area */}
          <Route element={<RoleRoute allowedRoles={['HR']} />}>
            <Route path="/hr" element={<HRDashboardPage />} />
            <Route path="/hr/positions" element={<HRPositionsPage />} />
            <Route path="/hr/positions/new" element={<HRCreatePositionPage />} />
            <Route path="/hr/positions/:positionId" element={<HRPositionDetailPage />} />
            <Route path="/hr/positions/:positionId/pipeline" element={<HRPipelineEditorPage />} />
            <Route path="/hr/applications" element={<HRApplicationsPage />} />
            <Route path="/hr/applications/:applicationId" element={<HRApplicationDetailPage />} />
            <Route path="/hr/interviews" element={<HRInterviewsPage />} />
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
