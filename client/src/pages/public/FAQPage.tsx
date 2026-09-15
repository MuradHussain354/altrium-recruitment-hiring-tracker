import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, FileText, Search, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FAQCategory {
  title: string;
  description: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    title: 'General & Platform',
    description: 'Learn more about the Altrium Recruitment Tracker, data privacy, and how our platform operates.',
    items: [
      {
        id: 'gen-1',
        question: 'What is the Altrium Recruitment Tracker?',
        answer: (
          <p>
            The Altrium Recruitment Tracker is a dedicated platform designed to manage and streamline our hiring process end-to-end. It allows prospective candidates to browse published opportunities, submit applications directly with resume uploads, and track their application progress transparently without needing an account.
          </p>
        ),
      },
      {
        id: 'gen-2',
        question: 'Do I need an account to apply for a role or track my status?',
        answer: (
          <p>
            No candidate account is required. When you submit an application, a unique Application Reference ID (UUID) is displayed on your application confirmation screen. You can use this reference ID along with your email address at any time on our{' '}
            <Link to="/track" className="inline-link">
              Track My Application
            </Link>{' '}
            page to check your current pipeline stage.
          </p>
        ),
      },
      {
        id: 'gen-3',
        question: 'What file formats and sizes are accepted for resumes/CVs?',
        answer: (
          <p>
            We accept PDF, Microsoft Word (.doc, .docx), and plain text documents up to 5MB in file size. Uploaded resumes are stored securely within the recruitment platform.
          </p>
        ),
      },
      {
        id: 'gen-4',
        question: 'How is my personal information protected?',
        answer: (
          <p>
            Access to application information is controlled through role-based access permissions within the recruitment system, ensuring that candidate details and submitted files are restricted to authorized personnel.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Careers & Hiring Process',
    description: 'Understand how we review applications, our evaluation stages, and how to stay updated.',
    items: [
      {
        id: 'hiring-1',
        question: 'How does the hiring workflow progress at Altrium?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>
              Every open role follows a structured multi-stage recruitment pipeline:
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.7' }}>
              <li><strong>1. Application Submission:</strong> You submit your resume and profile details.</li>
              <li><strong>2. Profile Review:</strong> HR and hiring team members review qualifications and experience.</li>
              <li><strong>3. Structured Evaluations:</strong> Structured interviews and role-specific evaluations.</li>
              <li><strong>4. Final Decision & Communication:</strong> Final hiring decision and status communication.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'hiring-2',
        question: 'Can I apply for multiple roles at the same time?',
        answer: (
          <p>
            Yes, you may submit applications for multiple roles that match your skill set. Each application generates its own distinct Reference ID, allowing you to track each position independently. However, duplicate submissions for the exact same position using the same email address while an application is currently active are prevented to avoid duplicate reviews.
          </p>
        ),
      },
      {
        id: 'hiring-3',
        question: 'How long does the hiring process typically take?',
        answer: (
          <p>
            Review timelines vary depending on the role, application volume, and hiring requirements. You can use the{' '}
            <Link to="/track" className="inline-link">
              Track My Application
            </Link>{' '}
            page to view your current application stage.
          </p>
        ),
      },
      {
        id: 'hiring-4',
        question: 'How can I stay informed about future openings if there is no current match?',
        answer: (
          <p>
            You can save your preferences for Job Alerts on the{' '}
            <Link to="/careers#job-alerts" className="inline-link">
              Careers page
            </Link>
            . Provide your email address and optional department or keyword preferences. Your subscription preferences are saved, and email notifications will be enabled once the notification service is connected.
          </p>
        ),
      },
      {
        id: 'hiring-5',
        question: 'What should I do if I lose my Application Reference ID?',
        answer: (
          <p>
            Your Reference ID is displayed on the Application Success confirmation screen upon submission. If you did not save it, please reach out via our{' '}
            <Link to="/contact" className="inline-link">
              Contact page
            </Link>{' '}
            with your full name, email address, and the position applied for so our team can assist you.
          </p>
        ),
      },
    ],
  },
];

export const FAQPage: React.FC = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'gen-1': true,
    'hiring-1': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="container faq-page">
      {/* Hero */}
      <header className="page-hero">
        <div className="page-hero__badge">
          <HelpCircle size={14} />
          Knowledge Base
        </div>
        <h1 className="page-hero__title">Frequently Asked Questions</h1>
        <p className="page-hero__subtitle">
          Find answers to common questions about our application process, candidate evaluation, and tracking your status.
        </p>
      </header>

      {/* Categories */}
      <div className="faq-categories">
        {FAQ_DATA.map((cat, catIdx) => (
          <section key={catIdx} className="faq-category">
            <div className="faq-category__header">
              <h2 className="faq-category__title">{cat.title}</h2>
              <p className="faq-category__desc">{cat.description}</p>
            </div>

            <div className="faq-accordion" role="region" aria-label={cat.title}>
              {cat.items.map((item) => {
                const isOpen = !!openItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`faq-item glass-card ${isOpen ? 'faq-item--open' : ''}`}
                  >
                    <button
                      type="button"
                      className="faq-item__trigger"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${item.id}`}
                      id={`faq-btn-${item.id}`}
                    >
                      <span className="faq-item__trigger-text">{item.question}</span>
                      <ChevronDown
                        size={18}
                        className={`faq-item__icon ${isOpen ? 'faq-item__icon--rotated' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        className="faq-item__body"
                        id={`faq-answer-${item.id}`}
                        role="region"
                        aria-labelledby={`faq-btn-${item.id}`}
                      >
                        <div className="faq-item__body-inner">{item.answer}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Still Have Questions CTA */}
      <section className="faq-cta glass-card">
        <div className="faq-cta__content">
          <h2 className="faq-cta__title">Still have questions?</h2>
          <p className="faq-cta__desc">
            Can't find what you are looking for? Our recruitment coordination team is here to assist with your inquiries.
          </p>
          <div className="faq-cta__actions">
            <Link to="/contact" className="btn-primary">
              Contact Our Team
              <ArrowRight size={15} />
            </Link>
            <Link to="/track" className="btn-secondary">
              <Search size={15} />
              Track Application
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
