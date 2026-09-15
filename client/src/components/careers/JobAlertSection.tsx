import React, { useState } from 'react';
import { Bell, Loader2, CheckCircle, Mail, Building2, Search, AlertCircle } from 'lucide-react';
import { subscribeJobAlert } from '../../api/publicCareers.api';
import { JobAlertSubscriptionInput } from '../../types/careers';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface FieldErrors {
  email?: string;
  department?: string;
  keyword?: string;
}

export const JobAlertSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [keyword, setKeyword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    const input: JobAlertSubscriptionInput = { email: email.trim() };
    if (department.trim()) input.department = department.trim();
    if (keyword.trim()) input.keyword = keyword.trim();

    setIsLoading(true);
    try {
      await subscribeJobAlert(input);
      setIsSuccess(true);
    } catch (err: any) {
      if (err?.error === 'NetworkError') {
        setApiError('Could not reach the server. Please check your connection and try again.');
      } else {
        setApiError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="job-alert-section glass-card" aria-label="Job alert subscription confirmed">
        <div className="job-alert-success">
          <div className="job-alert-success__icon">
            <CheckCircle size={40} />
          </div>
          <h2 className="job-alert-success__title">Preferences Saved</h2>
          <p className="job-alert-success__text">
            Your job alert preferences have been saved for <strong>{email}</strong>. Email notifications will be enabled once the notification service is connected.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="job-alert-section glass-card" aria-labelledby="job-alert-title">
      <div className="job-alert-section__header">
        <div className="job-alert-section__icon-wrapper">
          <Bell size={22} />
        </div>
        <div>
          <h2 id="job-alert-title" className="job-alert-section__title">Get Notified of New Openings</h2>
          <p className="job-alert-section__subtitle">
            Subscribe to be the first to hear about new roles that match your interests.
          </p>
        </div>
      </div>

      <form
        id="job-alert-form"
        className="job-alert-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Job alert subscription form"
      >
        {/* Email */}
        <div className="form-group">
          <label htmlFor="alert-email" className="form-label">
            Email Address <span className="form-required" aria-hidden="true">*</span>
          </label>
          <div className="input-icon-wrapper">
            <Mail size={16} className="input-icon" aria-hidden="true" />
            <input
              id="alert-email"
              type="email"
              className={`input-field input-field--icon-left${fieldErrors.email ? ' input-field--error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              disabled={isLoading}
              aria-required="true"
              aria-describedby={fieldErrors.email ? 'alert-email-error' : undefined}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && (
            <p id="alert-email-error" className="field-error" role="alert">{fieldErrors.email}</p>
          )}
        </div>

        <div className="job-alert-form__row">
          {/* Department */}
          <div className="form-group">
            <label htmlFor="alert-department" className="form-label">
              Department <span className="form-optional">(optional)</span>
            </label>
            <div className="input-icon-wrapper">
              <Building2 size={16} className="input-icon" aria-hidden="true" />
              <input
                id="alert-department"
                type="text"
                className="input-field input-field--icon-left"
                placeholder="e.g. Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Keyword */}
          <div className="form-group">
            <label htmlFor="alert-keyword" className="form-label">
              Keyword <span className="form-optional">(optional)</span>
            </label>
            <div className="input-icon-wrapper">
              <Search size={16} className="input-icon" aria-hidden="true" />
              <input
                id="alert-keyword"
                type="text"
                className="input-field input-field--icon-left"
                placeholder="e.g. React, DevOps"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {apiError && (
          <div className="job-alert-error" role="alert">
            <AlertCircle size={15} />
            <span>{apiError}</span>
          </div>
        )}

        <button
          id="job-alert-subscribe-btn"
          type="submit"
          className="btn-primary job-alert-form__submit"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" />
              Subscribing...
            </>
          ) : (
            <>
              <Bell size={16} aria-hidden="true" />
              Notify Me of New Roles
            </>
          )}
        </button>

        <p className="job-alert-form__privacy">
          Your preferences will be stored and used to notify you once the email notification service is connected.
        </p>
      </form>
    </section>
  );
};

export default JobAlertSection;
