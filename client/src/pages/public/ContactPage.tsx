import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <div className="stub-page">
      <div className="stub-page__icon">
        <MessageSquare size={40} />
      </div>
      <h1 className="stub-page__title">Contact Us</h1>
      <p className="stub-page__text">
        Our recruitment team is happy to answer any questions you may have about
        open positions or the application process.
      </p>
      <p className="stub-page__note">
        Contact details and a contact form will be available in a future update.
      </p>
      <Link to="/" className="btn-secondary stub-page__back">
        <ArrowLeft size={16} />
        Back to Home
      </Link>
    </div>
  );
};

export default ContactPage;
