import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Target,
  Eye,
  Heart,
  Zap,
  Users,
  Star,
  Briefcase,
  ArrowRight,
  CheckCircle,
  Globe,
  Award,
} from 'lucide-react';

const VALUES = [
  {
    icon: <Heart size={22} />,
    title: 'Respect & Inclusion',
    desc: 'We treat every candidate and colleague with dignity, regardless of background, level, or outcome.',
  },
  {
    icon: <Eye size={22} />,
    title: 'Transparency',
    desc: 'Clear, honest communication at every stage — from application through final decision.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Continuous Improvement',
    desc: 'We actively refine our processes based on feedback from candidates and hiring teams alike.',
  },
  {
    icon: <Star size={22} />,
    title: 'Quality of Process',
    desc: 'Every application deserves thoughtful review. We do not cut corners in evaluation.',
  },
  {
    icon: <Users size={22} />,
    title: 'Collaborative Hiring',
    desc: 'Hiring decisions are made together — HR, team leads, and management working in alignment.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Fairness First',
    desc: 'Structured evaluation criteria ensure consistent, unbiased assessment of every candidate.',
  },
];

const CULTURE_POINTS = [
  { icon: <CheckCircle size={16} />, text: 'Cross-functional team collaboration' },
  { icon: <CheckCircle size={16} />, text: 'Structured, stage-based interview process' },
  { icon: <CheckCircle size={16} />, text: 'Continuous learning and development mindset' },
  { icon: <CheckCircle size={16} />, text: 'Feedback-driven hiring with documented criteria' },
  { icon: <CheckCircle size={16} />, text: 'Respectful, direct, and inclusive communication' },
];

const WHY_POINTS = [
  {
    icon: <Briefcase size={20} />,
    title: 'Meaningful Work',
    desc: 'Roles across engineering, operations, product, and leadership—each contributing to a shared mission.',
  },
  {
    icon: <Users size={20} />,
    title: 'Supportive Teams',
    desc: 'Join cross-functional teams that value diverse perspectives and collaborative problem-solving.',
  },
  {
    icon: <Award size={20} />,
    title: 'Fair Evaluation',
    desc: 'A transparent, structured hiring process that treats every candidate with equal care and rigour.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Growth Opportunity',
    desc: 'We invest in people who are curious, driven, and eager to grow — at every stage of their career.',
  },
];

export const AboutPage: React.FC = () => {
  return (
    <div className="container about-page">

      {/* Page Header */}
      <header className="page-hero">
        <div className="page-hero__badge">
          <ShieldCheck size={14} />
          About Altrium
        </div>
        <h1 className="page-hero__title">We Are Altrium</h1>
        <p className="page-hero__subtitle">
          A recruitment-focused organisation committed to connecting talented people with opportunities that matter.
        </p>
      </header>

      {/* Our Story */}
      <section className="about-section glass-card" aria-labelledby="about-story">
        <div className="about-section__icon" style={{ color: 'var(--primary)' }}>
          <ShieldCheck size={28} />
        </div>
        <h2 id="about-story" className="about-section__title">Our Story</h2>
        <p className="about-section__text">
          Altrium was built to solve a real problem: recruitment that is slow, opaque, and frustrating for everyone involved. We set out to create a structured, transparent system — one where candidates know where they stand, hiring teams work in alignment, and every hire reflects genuine organisational need.
        </p>
        <p className="about-section__text">
          The Altrium Recruitment Tracker is the platform that powers this mission. It gives HR teams, team leads, and managers the tools to collaborate on hiring decisions in an organised, auditable, and candidate-respectful way.
        </p>
      </section>

      {/* Mission & Vision */}
      <div className="about-mission-grid">
        <section className="glass-card about-mv-card" aria-labelledby="about-mission">
          <div className="about-mv-card__icon" style={{ color: 'var(--primary)' }}>
            <Target size={26} />
          </div>
          <h2 id="about-mission" className="about-mv-card__title">Mission</h2>
          <p className="about-mv-card__text">
            To streamline end-to-end recruitment through structured processes, transparent communication, and collaborative decision-making — creating better outcomes for candidates and organisations alike.
          </p>
        </section>
        <section className="glass-card about-mv-card" aria-labelledby="about-vision">
          <div className="about-mv-card__icon" style={{ color: 'var(--accent-cyan)' }}>
            <Eye size={26} />
          </div>
          <h2 id="about-vision" className="about-mv-card__title">Vision</h2>
          <p className="about-mv-card__text">
            A world where every hiring decision is made thoughtfully, every candidate is treated with respect, and the journey from application to offer is clear and fair at every step.
          </p>
        </section>
      </div>

      {/* Values */}
      <section className="about-section" aria-labelledby="about-values">
        <h2 id="about-values" className="about-section__title about-section__title--center">
          Our Core Values
        </h2>
        <p className="about-section__subtitle--center">
          The principles that guide how we build, hire, and work together.
        </p>
        <div className="about-values-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="glass-card about-value-card">
              <div className="about-value-card__icon">{v.icon}</div>
              <h3 className="about-value-card__title">{v.title}</h3>
              <p className="about-value-card__desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team & Goals */}
      <section className="about-section glass-card" aria-labelledby="about-team-goals">
        <h2 id="about-team-goals" className="about-section__title">Team &amp; Goals</h2>
        <p className="about-section__text">
          Altrium's hiring process is designed around collaboration between three key roles:
        </p>
        <ul className="about-team-roles" role="list">
          <li>
            <strong>HR Team</strong> — Manages positions, oversees pipeline, coordinates scheduling, and maintains candidate records.
          </li>
          <li>
            <strong>Team Leads</strong> — Conduct structured interviews, submit scored feedback, and contribute to final recommendations.
          </li>
          <li>
            <strong>Management</strong> — Oversees recruitment health through reporting, approves headcount, and maintains system configuration.
          </li>
        </ul>
        <p className="about-section__text" style={{ marginTop: '16px' }}>
          Together, these roles operate within a structured pipeline — from <strong>application submission</strong> through each configured stage to a <strong>final hiring decision</strong>.
        </p>
      </section>

      {/* Culture & Work Environment */}
      <section className="about-section" aria-labelledby="about-culture">
        <h2 id="about-culture" className="about-section__title about-section__title--center">
          Culture &amp; Work Environment
        </h2>
        <div className="about-culture-grid">
          <div className="glass-card about-culture-card">
            <h3 className="about-culture-card__title">How We Work</h3>
            <ul className="about-culture-list" role="list">
              {CULTURE_POINTS.map((c) => (
                <li key={c.text} className="about-culture-item">
                  <span style={{ color: 'var(--accent-emerald)', flexShrink: 0 }}>{c.icon}</span>
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card about-culture-card">
            <h3 className="about-culture-card__title">Our Commitment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>
              We believe the best teams are built on trust, not pressure. Every process we run — internally or facing candidates — is designed to be structured, respectful, and consistently applied.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginTop: '12px' }}>
              Our evaluation pipeline ensures that hiring decisions are never made arbitrarily. Feedback is documented, criteria are defined, and every candidate receives consideration appropriate to their application.
            </p>
          </div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="about-section" aria-labelledby="about-why">
        <h2 id="about-why" className="about-section__title about-section__title--center">
          Why Work With Us
        </h2>
        <div className="about-why-grid">
          {WHY_POINTS.map((w) => (
            <div key={w.title} className="glass-card about-why-card">
              <div className="about-why-card__icon">{w.icon}</div>
              <h3 className="about-why-card__title">{w.title}</h3>
              <p className="about-why-card__desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta glass-card" aria-label="Careers call to action">
        <h2 className="about-cta__title">Ready to Join?</h2>
        <p className="about-cta__text">
          Explore our current openings and take the first step towards your next opportunity.
        </p>
        <Link to="/careers" className="btn-primary" id="about-cta-careers-btn">
          <Briefcase size={16} />
          Browse Open Positions
          <ArrowRight size={16} />
        </Link>
      </section>

    </div>
  );
};

export default AboutPage;
