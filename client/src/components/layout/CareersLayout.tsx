import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

/**
 * CareersLayout wraps all public careers-facing pages.
 * Provides the shared PublicNavbar (fixed top) and PublicFooter.
 * Used by: /, /careers, /careers/:id, /careers/:id/apply,
 *          /application-success, /about, /contact
 *
 * NOTE: /login and /unauthorized continue using the existing PublicLayout
 * which has no navbar (intentional — auth/error pages should be clean).
 */
export const CareersLayout: React.FC = () => {
  return (
    <div className="careers-layout">
      <PublicNavbar />
      <main className="careers-layout__main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default CareersLayout;
