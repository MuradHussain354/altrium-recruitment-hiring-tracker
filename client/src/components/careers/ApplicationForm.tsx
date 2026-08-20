import React, { useState } from 'react';
import { User, Mail, Phone, Link2, Send, Loader2 } from 'lucide-react';
import { PublicPosition, PublicApplicationInput, PublicApplicationResponse } from '../../types/careers';
import { submitApplication } from '../../api/publicCareers.api';
import { ApiErrorResponse } from '../../types/auth';
import ErrorBanner from '../ui/ErrorBanner';

interface ApplicationFormProps {
  position: PublicPosition;
  onSuccess: (result: PublicApplicationResponse) => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
  resumeUrl?: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

function mapApiError(err: any): string {
  const message: string = err?.message ?? '';

  if (message.includes('no longer accepting') || message.includes('not open')) {
    return 'This position is no longer accepting applications.';
  }
  if (message.includes('not yet configured') || message.includes('not yet ready')) {
    return 'This position is not yet ready for applications. Please check back later.';
  }
  if (message.includes('already applied')) {
    return "It looks like you've already applied for this position. Check your email for confirmation.";
  }
  if (message.includes('not found') || message.includes('Position not found')) {
    return 'This position no longer exists.';
  }
  if (err?.error === 'NetworkError') {
    return 'Could not reach the server. Please check your connection and try again.';
  }
  // Zod validation messages from backend are already user-friendly
  if (message) return message;
  return 'An unexpected error occurred. Please try again.';
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ position, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // resumeUrl: optional — only validate if non-empty
    if (resumeUrl.trim() !== '' && !isValidUrl(resumeUrl)) {
      errors.resumeUrl = 'Please enter a valid URL (e.g. https://...).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    const payload: PublicApplicationInput = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      positionId: position.id,
    };

    if (phone.trim()) payload.phone = phone.trim();
    if (resumeUrl.trim()) payload.resumeUrl = resumeUrl.trim();

    setIsSubmitting(true);
    try {
      const result = await submitApplication(payload);
      onSuccess(result);
    } catch (err: any) {
      setSubmitError(mapApiError(err as ApiErrorResponse));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="application-form"
      className="application-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Job application form"
    >
      {/* Full Name */}
      <div className="form-group">
        <label htmlFor="app-name" className="form-label">
          Full Name <span className="form-required" aria-hidden="true">*</span>
        </label>
        <div className="input-icon-wrapper">
          <User size={16} className="input-icon" aria-hidden="true" />
          <input
            id="app-name"
            type="text"
            className={`input-field input-field--icon-left${fieldErrors.name ? ' input-field--error' : ''}`}
            placeholder="Your full name"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
            disabled={isSubmitting}
            aria-required="true"
            aria-describedby={fieldErrors.name ? 'app-name-error' : undefined}
            autoComplete="name"
          />
        </div>
        {fieldErrors.name && (
          <p id="app-name-error" className="field-error" role="alert">{fieldErrors.name}</p>
        )}
      </div>

      {/* Email Address */}
      <div className="form-group">
        <label htmlFor="app-email" className="form-label">
          Email Address <span className="form-required" aria-hidden="true">*</span>
        </label>
        <div className="input-icon-wrapper">
          <Mail size={16} className="input-icon" aria-hidden="true" />
          <input
            id="app-email"
            type="email"
            className={`input-field input-field--icon-left${fieldErrors.email ? ' input-field--error' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
            disabled={isSubmitting}
            aria-required="true"
            aria-describedby={fieldErrors.email ? 'app-email-error' : undefined}
            autoComplete="email"
          />
        </div>
        {fieldErrors.email && (
          <p id="app-email-error" className="field-error" role="alert">{fieldErrors.email}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div className="form-group">
        <label htmlFor="app-phone" className="form-label">
          Phone Number <span className="form-optional">(optional)</span>
        </label>
        <div className="input-icon-wrapper">
          <Phone size={16} className="input-icon" aria-hidden="true" />
          <input
            id="app-phone"
            type="tel"
            className="input-field input-field--icon-left"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Resume / CV URL (optional) */}
      <div className="form-group">
        <label htmlFor="app-resume" className="form-label">
          Resume / CV URL <span className="form-optional">(optional)</span>
        </label>
        <div className="input-icon-wrapper">
          <Link2 size={16} className="input-icon" aria-hidden="true" />
          <input
            id="app-resume"
            type="url"
            className={`input-field input-field--icon-left${fieldErrors.resumeUrl ? ' input-field--error' : ''}`}
            placeholder="https://..."
            value={resumeUrl}
            onChange={(e) => { setResumeUrl(e.target.value); setFieldErrors((prev) => ({ ...prev, resumeUrl: undefined })); }}
            disabled={isSubmitting}
            aria-describedby={fieldErrors.resumeUrl ? 'app-resume-error' : 'app-resume-helper'}
            autoComplete="off"
          />
        </div>
        {fieldErrors.resumeUrl ? (
          <p id="app-resume-error" className="field-error" role="alert">{fieldErrors.resumeUrl}</p>
        ) : (
          <p id="app-resume-helper" className="form-helper">
            Paste a publicly accessible link to your resume or CV.
          </p>
        )}
      </div>

      {/* API Error */}
      {submitError && (
        <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
      )}

      {/* Submit */}
      <button
        id="application-submit-btn"
        type="submit"
        className="btn-primary application-form__submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="spin" aria-hidden="true" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={16} aria-hidden="true" />
            Submit Application
          </>
        )}
      </button>

      <p className="application-form__privacy">
        Your information is used only for this application.
      </p>
    </form>
  );
};

export default ApplicationForm;
