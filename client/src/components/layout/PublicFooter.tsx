import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-public" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo-icon">
            <ShieldCheck size={14} />
          </div>
          <span className="footer-brand-text">Altrium Recruitment Tracker</span>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/careers" className="footer-link">Careers</Link>
          <Link to="/about" className="footer-link">About</Link>
          <Link to="/contact" className="footer-link">Contact</Link>
          <Link to="/login" className="footer-link">Login</Link>
        </nav>

        <p className="footer-copy">
          &copy; {year} Altrium Recruitment Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default PublicFooter;
