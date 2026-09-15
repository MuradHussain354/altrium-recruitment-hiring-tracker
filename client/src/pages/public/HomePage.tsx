import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Target,
  Users,
  Zap,
  Search,
  Star,
  CheckCircle,
  Loader2,
  RefreshCw,
  Bell,
  ClipboardList,
} from 'lucide-react';
import { PublicPosition } from '../../types/careers';
import { getPublicPositions } from '../../api/publicCareers.api';
import JobCard from '../../components/careers/JobCard';

// ───────────────────────────────────────────────
// At-a-Glance pillars (no invented statistics)
// ───────────────────────────────────────────────
const PILLARS = [
  {
    icon: <Target size={24} />,
    title: 'Mission-Driven',
    desc: 'We connect talented individuals with roles that align with their goals and values.',
  },
  {
    icon: <Users size={24} />,
    title: 'People First',
    desc: 'Every hire matters. Our process is designed around respect, clarity, and fairness.',
  },
  {
    icon: <Zap size={24} />,
    title: 'Structured & Transparent',
    desc: 'Candidates know where they stand. Our pipeline is organised, tracked, and communicated.',
  },
  {
    icon: <Star size={24} />,
    title: 'Quality over Volume',
    desc: 'We focus on fit, skills, and potential — not just credentials.',
  },
];

// ───────────────────────────────────────────────
// What We Do domains
// ───────────────────────────────────────────────
const DOMAINS = [
  { icon: <Briefcase size={20} />, label: 'Engineering & Technology' },
  { icon: <Users size={20} />, label: 'Operations & Management' },
  { icon: <Target size={20} />, label: 'Product & Strategy' },
  { icon: <Star size={20} />, label: 'Design & Creative' },
];

// ───────────────────────────────────────────────
// Life at Altrium culture points
// ───────────────────────────────────────────────
const CULTURE_POINTS = [
  { icon: <CheckCircle size={18} />, text: 'Collaborative, cross-functional teams' },
  { icon: <CheckCircle size={18} />, text: 'Transparent hiring and evaluation process' },
  { icon: <CheckCircle size={18} />, text: 'Continuous feedback and learning culture' },
  { icon: <CheckCircle size={18} />, text: 'Respectful and inclusive workplace environment' },
];

export const HomePage: React.FC = () => {
  const [featuredPositions, setFeaturedPositions] = useState<PublicPosition[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const fetchFeatured = useCallback(async () => {
    setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const res = await getPublicPositions();
      // Sort by newest first, show up to 3
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setFeaturedPositions(sorted.slice(0, 3));
    } catch (err: any) {
      setFeaturedError(err?.message || 'Failed to load open positions.');
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  return (
    <div className="home-page">

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__badge">
          <ShieldCheck size={14} />
          Altrium Recruitment
        </div>
        <h1 id="home-hero-title" className="home-hero__title">
          Find Your Next<br />
          <span className="home-hero__title-accent">Career Chapter</span>
        </h1>
        <p className="home-hero__subtitle">
          Explore open positions across our teams and take the next meaningful step in your professional journey.
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
          <Link
            to="/track"
            className="btn-secondary home-hero__cta-secondary"
            aria-label="Track your application"
          >
            <ClipboardList size={16} />
            Track My Application
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          AT-A-GLANCE
      ═══════════════════════════════════════ */}
      <section className="home-section" aria-labelledby="home-pillars-title">
        <div className="home-section__header">
          <div className="page-hero__badge" style={{ display: 'inline-flex' }}>
            <Star size={13} /> At a Glance
          </div>
          <h2 id="home-pillars-title" className="home-section__title">
            Recruitment Built Around People
          </h2>
          <p className="home-section__subtitle">
            Altrium Recruitment Tracker powers a structured, candidate-friendly hiring experience — from first application to final decision.
          </p>
        </div>
        <div className="home-pillars">
          {PILLARS.map((p) => (
            <div key={p.title} className="home-pillar glass-card">
              <div className="home-pillar__icon">{p.icon}</div>
              <h3 className="home-pillar__title">{p.title}</h3>
              <p className="home-pillar__desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHAT WE DO
      ═══════════════════════════════════════ */}
      <section className="home-section home-what-we-do" aria-labelledby="home-what-title">
        <div className="home-what-we-do__inner">
          <div className="home-what-we-do__text">
            <div className="page-hero__badge" style={{ display: 'inline-flex' }}>
              <Briefcase size={13} /> What We Do
            </div>
            <h2 id="home-what-title" className="home-section__title" style={{ textAlign: 'left' }}>
              Connecting Talent Across Disciplines
            </h2>
            <p className="home-section__subtitle" style={{ textAlign: 'left', maxWidth: '100%' }}>
              We manage end-to-end recruitment across multiple departments — from sourcing and screening to structured interviews and final hiring decisions.
            </p>
            <div className="home-domains">
              {DOMAINS.map((d) => (
                <div key={d.label} className="home-domain-pill">
                  {d.icon}
                  {d.label}
                </div>
              ))}
            </div>
          </div>
          <div className="home-what-we-do__visual glass-card">
            <div className="home-visual-stat">
              <Search size={28} style={{ color: 'var(--primary)' }} />
              <span className="home-visual-stat__label">Structured screening</span>
            </div>
            <div className="home-visual-stat">
              <Users size={28} style={{ color: 'var(--accent-cyan)' }} />
              <span className="home-visual-stat__label">Collaborative evaluation</span>
            </div>
            <div className="home-visual-stat">
              <CheckCircle size={28} style={{ color: 'var(--accent-emerald)' }} />
              <span className="home-visual-stat__label">Transparent decisions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURED OPEN POSITIONS
      ═══════════════════════════════════════ */}
      <section className="home-section" aria-labelledby="home-featured-title">
        <div className="home-section__header">
          <div className="page-hero__badge" style={{ display: 'inline-flex' }}>
            <Briefcase size={13} /> Open Roles
          </div>
          <h2 id="home-featured-title" className="home-section__title">Featured Positions</h2>
          <p className="home-section__subtitle">
            Explore our latest open roles. Updated as positions become available.
          </p>
        </div>

        {/* Loading */}
        {featuredLoading && (
          <div className="careers-loading" role="status" aria-live="polite">
            <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading open positions…</p>
          </div>
        )}

        {/* Error */}
        {!featuredLoading && featuredError && (
          <div className="careers-empty glass-card" role="alert">
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
              Could not load featured positions. Please try again.
            </p>
            <button type="button" className="btn-secondary" onClick={fetchFeatured} style={{ fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!featuredLoading && !featuredError && featuredPositions.length === 0 && (
          <div className="careers-empty glass-card" role="region" aria-label="No positions available">
            <Briefcase size={36} style={{ color: 'var(--text-subtle)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No Open Positions Right Now</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              We're not currently advertising any openings. Subscribe to be notified when new roles are posted.
            </p>
            <Link to="/careers" className="btn-secondary">
              View Careers Page
            </Link>
          </div>
        )}

        {/* Cards */}
        {!featuredLoading && !featuredError && featuredPositions.length > 0 && (
          <>
            <div className="careers-grid">
              {featuredPositions.map((pos) => (
                <JobCard key={pos.id} position={pos} />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Link to="/careers" className="btn-secondary" id="home-view-all-btn">
                View All Open Positions <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════
          LIFE AT ALTRIUM
      ═══════════════════════════════════════ */}
      <section className="home-section home-culture" aria-labelledby="home-culture-title">
        <div className="home-culture__inner">
          <div className="home-culture__text">
            <div className="page-hero__badge" style={{ display: 'inline-flex' }}>
              <Star size={13} /> Culture
            </div>
            <h2 id="home-culture-title" className="home-section__title" style={{ textAlign: 'left' }}>
              Life at Altrium
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '480px' }}>
              We believe the best work happens when people feel respected, heard, and motivated. Our culture is built on that foundation.
            </p>
            <ul className="home-culture-list" role="list">
              {CULTURE_POINTS.map((c) => (
                <li key={c.text} className="home-culture-item">
                  <span style={{ color: 'var(--accent-emerald)', flexShrink: 0 }}>{c.icon}</span>
                  {c.text}
                </li>
              ))}
            </ul>
            <Link to="/about" className="btn-ghost" style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              About Altrium <ArrowRight size={15} />
            </Link>
          </div>
          <div className="home-culture__aside glass-card">
            <div className="home-culture-aside-icon">
              <ShieldCheck size={40} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>Transparent by Design</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              From application submission through each stage of evaluation, candidates and hiring teams have clear visibility into the recruitment process.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          JOB ALERT / FINAL CTA
      ═══════════════════════════════════════ */}
      <section className="home-cta-banner" aria-labelledby="home-cta-title">
        <div className="home-cta-banner__inner">
          <div className="home-cta-banner__text">
            <h2 id="home-cta-title" className="home-cta-banner__title">
              Don't See the Right Role Yet?
            </h2>
            <p className="home-cta-banner__subtitle">
              Browse all open positions or subscribe to job alerts so you never miss an opportunity.
            </p>
          </div>
          <div className="home-cta-banner__actions">
            <Link to="/careers" className="btn-primary" id="home-cta-careers-btn">
              <Briefcase size={16} /> Browse All Roles
            </Link>
            <Link to="/careers#job-alerts" className="btn-secondary" id="home-cta-alerts-btn">
              <Bell size={16} /> Subscribe to Alerts
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
