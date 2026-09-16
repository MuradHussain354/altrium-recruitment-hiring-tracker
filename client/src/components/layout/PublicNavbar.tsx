import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogIn } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Careers', to: '/careers' },
  { label: 'Track Application', to: '/track' },
  { label: 'FAQ', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const PublicNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar-public" role="navigation" aria-label="Public navigation">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="Altrium home">
          <div className="navbar-logo-icon">
            <ShieldCheck size={18} />
          </div>
          <span className="navbar-brand-name">Altrium</span>
          <span className="navbar-brand-sub">Recruitment</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links" role="menubar">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                isActive ? 'navbar-link navbar-link--active' : 'navbar-link'
              }
              role="menuitem"
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop Login */}
        <div className="navbar-actions">
          <Link to="/login" className="navbar-login-btn" id="navbar-internal-login">
            <LogIn size={15} />
            Internal Login
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="navbar-mobile-menu" role="menu">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'navbar-mobile-link navbar-mobile-link--active'
                  : 'navbar-mobile-link'
              }
              role="menuitem"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="navbar-mobile-divider" />
          <Link
            to="/login"
            className="navbar-mobile-link navbar-mobile-login"
            onClick={() => setMobileOpen(false)}
          >
            <LogIn size={15} />
            Internal Login
          </Link>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
