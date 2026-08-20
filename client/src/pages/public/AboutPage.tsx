import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="stub-page">
      <div className="stub-page__icon">
        <Info size={40} />
      </div>
      <h1 className="stub-page__title">About Altrium</h1>
      <p className="stub-page__text">
        Altrium is a forward-thinking organisation committed to connecting talented
        individuals with meaningful opportunities. Full company information is coming soon.
      </p>
      <p className="stub-page__note">
        More content will be available in a future update.
      </p>
      <Link to="/" className="btn-secondary stub-page__back">
        <ArrowLeft size={16} />
        Back to Home
      </Link>
    </div>
  );
};

export default AboutPage;
