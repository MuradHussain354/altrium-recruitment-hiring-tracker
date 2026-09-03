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

// Manager Portal Pages
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage';
import { ManagerPositionsReportPage } from './pages/manager/ManagerPositionsReportPage';
import { ManagerPipelineReportPage } from './pages/manager/ManagerPipelineReportPage';
import { ManagerInterviewsReportPage } from './pages/manager/ManagerInterviewsReportPage';
import { ManagerAccountsPage } from './pages/manager/ManagerAccountsPage';
import { ManagerTeamsPage } from './pages/manager/ManagerTeamsPage';
import { ManagerNotificationsPage } from './pages/manager/ManagerNotificationsPage';

// TeamLead Portal Pages
import { TeamLeadDashboardPage } from './pages/teamlead/TeamLeadDashboardPage';
import { TeamLeadInterviewsPage } from './pages/teamlead/TeamLeadInterviewsPage';
import { TeamLeadInterviewDetailPage } from './pages/teamlead/TeamLeadInterviewDetailPage';
import { TeamLeadNotificationsPage } from './pages/teamlead/TeamLeadNotificationsPage';

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
            <Route path="/manager" element={<ManagerDashboardPage />} />
            <Route path="/manager/reports/positions" element={<ManagerPositionsReportPage />} />
            <Route path="/manager/reports/pipeline" element={<ManagerPipelineReportPage />} />
            <Route path="/manager/reports/interviews" element={<ManagerInterviewsReportPage />} />
            <Route path="/manager/accounts" element={<ManagerAccountsPage />} />
            <Route path="/manager/teams" element={<ManagerTeamsPage />} />
            <Route path="/manager/notifications" element={<ManagerNotificationsPage />} />
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
            <Route path="/team-lead" element={<TeamLeadDashboardPage />} />
            <Route path="/team-lead/interviews" element={<TeamLeadInterviewsPage />} />
            <Route path="/team-lead/interviews/:interviewId" element={<TeamLeadInterviewDetailPage />} />
            <Route path="/team-lead/notifications" element={<TeamLeadNotificationsPage />} />
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
