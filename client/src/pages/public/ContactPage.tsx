import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Mail,
  User,
  Send,
  AlertCircle,
  Briefcase,
  HelpCircle,
  ArrowRight,
  Globe,
  ClipboardList,
} from 'lucide-react';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please enter your full name.';
    }
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!message.trim() || message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // No backend endpoint for general inquiries yet — acknowledge clearly.
    setSubmitted(true);
  };

  return (
    <div className="container contact-page">

      {/* Page Header */}
      <header className="page-hero">
        <div className="page-hero__badge">
          <MessageSquare size={14} />
          Contact
        </div>
        <h1 className="page-hero__title">Get in Touch</h1>
        <p className="page-hero__subtitle">
          Have a question about our recruitment process, open roles, or how to apply? We're happy to help.
        </p>
      </header>

      <div className="contact-layout">

        {/* Left: Contact Details + Quick Links */}
        <aside className="contact-aside">

          {/* How to Reach Us */}
          <section className="glass-card contact-aside-card" aria-labelledby="contact-reach">
            <h2 id="contact-reach" className="contact-aside-card__title">How to Reach Us</h2>
            <div className="contact-detail-item">
              <Mail size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <div>
                <p className="contact-detail-label">Recruitment Enquiries</p>
                <p className="contact-detail-value">Via the form on this page.</p>
              </div>
            </div>
            <div className="contact-detail-item">
              <Globe size={18} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
              <div>
                <p className="contact-detail-label">Operating Model</p>
                <p className="contact-detail-value">Distributed / Remote-friendly</p>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="glass-card contact-aside-card" aria-labelledby="contact-links">
            <h2 id="contact-links" className="contact-aside-card__title">Helpful Links</h2>
            <nav className="contact-quicklinks" aria-label="Quick links">
              <Link to="/careers" className="contact-quicklink">
                <Briefcase size={16} /> Browse Open Positions <ArrowRight size={14} />
              </Link>
              <Link to="/faq" className="contact-quicklink">
                <HelpCircle size={16} /> Frequently Asked Questions <ArrowRight size={14} />
              </Link>
              <Link to="/track" className="contact-quicklink">
                <ClipboardList size={16} /> Track My Application <ArrowRight size={14} />
              </Link>
            </nav>
          </section>

          {/* Recruitment note */}
          <div className="glass-card contact-aside-card contact-aside-tip" role="note">
            <AlertCircle size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} aria-hidden="true" />
            <p>
              For application-specific enquiries, please use <Link to="/track" className="inline-link">Track My Application</Link> to check your status using your reference ID.
            </p>
          </div>
        </aside>

        {/* Right: Contact Form */}
        <section className="glass-card contact-form-card" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="contact-form-card__title">General Enquiry</h2>

          {submitted ? (
            <div className="contact-form-submitted" role="alert" aria-live="polite">
              <div className="contact-form-submitted__icon">
                <MessageSquare size={36} />
              </div>
              <h3>Submission Acknowledged</h3>
              <p>
                Thank you, <strong>{name}</strong>. Your enquiry has been acknowledged in this frontend session. Please note that automated email delivery and database storage are not yet connected to this general contact form.
              </p>
              <p className="contact-form-submitted__note">
                <strong>Important Notice:</strong> Because automated backend delivery is not yet implemented, this message has not been transmitted or stored in a database. For all active application tracking and status checks, please use the <Link to="/track" className="inline-link">Application Tracker</Link> with your Reference ID.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSubmitted(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
              >
                Reset Form
              </button>
            </div>
          ) : (
            <form
              id="contact-form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="General enquiry contact form"
            >
              {/* Name */}
              <div className="form-group">
                <label htmlFor="contact-name" className="form-label">
                  Full Name <span className="form-required" aria-hidden="true">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <User size={16} className="input-icon" aria-hidden="true" />
                  <input
                    id="contact-name"
                    type="text"
                    className={`input-field input-field--icon-left${fieldErrors.name ? ' input-field--error' : ''}`}
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }}
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="field-error" role="alert">{fieldErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="contact-email" className="form-label">
                  Email Address <span className="form-required" aria-hidden="true">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <Mail size={16} className="input-icon" aria-hidden="true" />
                  <input
                    id="contact-email"
                    type="email"
                    className={`input-field input-field--icon-left${fieldErrors.email ? ' input-field--error' : ''}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="field-error" role="alert">{fieldErrors.email}</p>
                )}
              </div>

              {/* Subject */}
              <div className="form-group">
                <label htmlFor="contact-subject" className="form-label">
                  Subject <span className="form-optional">(optional)</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  className="input-field"
                  placeholder="What is your enquiry about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Message */}
              <div className="form-group">
                <label htmlFor="contact-message" className="form-label">
                  Message <span className="form-required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="contact-message"
                  className={`input-field${fieldErrors.message ? ' input-field--error' : ''}`}
                  placeholder="Describe your enquiry…"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setFieldErrors(p => ({ ...p, message: undefined })); }}
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
                {fieldErrors.message && (
                  <p className="field-error" role="alert">{fieldErrors.message}</p>
                )}
              </div>

              {/* Disclosure */}
              <div className="contact-form-disclosure" role="note">
                <AlertCircle size={14} aria-hidden="true" />
                <span>
                  This form currently provides a frontend-only acknowledgement. Automated email delivery and database storage are not yet connected. For application status, use <Link to="/track" className="inline-link">Track My Application</Link>.
                </span>
              </div>

              <button
                id="contact-submit-btn"
                type="submit"
                className="btn-primary contact-form-card__submit"
              >
                <Send size={16} aria-hidden="true" />
                Send Enquiry
              </button>
            </form>
          )}
        </section>
      </div>

    </div>
  );
};

export default ContactPage;
