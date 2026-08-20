import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ShieldCheck, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__badge">
          <ShieldCheck size={14} />
          Altrium Recruitment Tracker
        </div>
        <h1 id="home-hero-title" className="home-hero__title">
          Find Your Next<br />
          <span className="home-hero__title-accent">Opportunity</span>
        </h1>
        <p className="home-hero__subtitle">
          Explore open positions across our teams and take the next step in your career.
        </p>
        <div className="home-hero__actions">
          <Link
            to="/careers"
            id="home-view-openings-btn"
            className="btn-primary home-hero__cta"
            aria-label="View all open positions"
          >
            <Briefcase size={17} />
            View Open Positions
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Sprint 1 stub — full marketing content is Sprint 2 */}
      <section className="home-info" aria-label="Quick links">
        <div className="home-info__cards">
          <div className="glass-card home-info__card">
            <h2 className="home-info__card-title">Current Openings</h2>
            <p className="home-info__card-text">
              Browse all available roles across our departments.
            </p>
            <Link to="/careers" className="home-info__card-link">
              See all openings <ArrowRight size={14} />
            </Link>
          </div>
          <div className="glass-card home-info__card">
            <h2 className="home-info__card-title">About Altrium</h2>
            <p className="home-info__card-text">
              Learn more about our mission, teams, and culture.
            </p>
            <Link to="/about" className="home-info__card-link">
              About us <ArrowRight size={14} />
            </Link>
          </div>
          <div className="glass-card home-info__card">
            <h2 className="home-info__card-title">Get in Touch</h2>
            <p className="home-info__card-text">
              Have questions? Our team is ready to help.
            </p>
            <Link to="/contact" className="home-info__card-link">
              Contact us <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
