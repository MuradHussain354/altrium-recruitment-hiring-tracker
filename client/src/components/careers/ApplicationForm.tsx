import React, { useState, useRef } from 'react';
import { User, Mail, Phone, FileText, Upload, X, Send, Loader2 } from 'lucide-react';
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
  file?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  // Zod / Multer validation messages from backend
  if (message) return message;
  return 'An unexpected error occurred. Please try again.';
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ position, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFieldErrors((prev) => ({ ...prev, file: undefined }));

    if (!selectedFile) {
      setCvFile(null);
      return;
    }

    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.'
      }));
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'File size exceeds the 5 MB limit. Please upload a smaller file.'
      }));
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCvFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

    if (!cvFile) {
      errors.file = 'Please select your CV / Resume file.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate() || !cvFile) return;

    const payload: PublicApplicationInput = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      positionId: position.id,
      resume: cvFile
    };

    if (phone.trim()) payload.phone = phone.trim();

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

      {/* CV / Resume File Upload */}
      <div className="form-group">
        <label htmlFor="app-resume-file" className="form-label">
          CV / Resume <span className="form-required" aria-hidden="true">*</span>
        </label>

        <div className="file-upload-container">
          <input
            id="app-resume-file"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={isSubmitting}
            aria-required="true"
            aria-describedby={fieldErrors.file ? 'app-resume-error' : 'app-resume-helper'}
            className="file-upload-input"
            style={{ display: 'none' }}
          />

          {!cvFile ? (
            <button
              type="button"
              className={`file-upload-btn btn-secondary${fieldErrors.file ? ' file-upload-btn--error' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              id="app-file-picker-btn"
            >
              <Upload size={16} aria-hidden="true" />
              <span>Choose CV File</span>
            </button>
          ) : (
            <div className="file-upload-selected" id="app-file-selected-info">
              <div className="file-upload-info">
                <FileText size={16} className="file-upload-icon" aria-hidden="true" />
                <span className="file-upload-name">{cvFile.name}</span>
                <span className="file-upload-size">({formatFileSize(cvFile.size)})</span>
              </div>
              <button
                type="button"
                className="file-upload-remove-btn"
                onClick={handleRemoveFile}
                disabled={isSubmitting}
                aria-label="Remove selected CV file"
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {fieldErrors.file ? (
          <p id="app-resume-error" className="field-error" role="alert">{fieldErrors.file}</p>
        ) : (
          <p id="app-resume-helper" className="form-helper">
            Accepted formats: PDF, DOC, DOCX • Maximum size: 5 MB
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
