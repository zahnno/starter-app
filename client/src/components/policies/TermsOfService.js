import React from 'react';
import '../../styles/staticPages.css';

const TermsOfService = () => {
  return (
    <div className="static-page">
      <div className="static-page-content">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: January 1, 2025</p>

        <section className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using the services provided by ------ Inc. ("we", "our", or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </section>

        <section className="terms-section">
          <h2>2. Service Description</h2>
          <p>Our services include:</p>
          <ul>
            <li>Subscription-based premium features</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>3. User Accounts</h2>
          <p>You must create an account to use our services. You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account</li>
            <li>All activities that occur under your account</li>
            <li>Providing accurate and current information</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>4. Subscription and Payments</h2>
          <p>Subscription fees are charged in advance on a recurring basis. You may cancel your subscription at any time.</p>
        </section>

        <section className="terms-section">
          <h2>5. Intellectual Property</h2>
          <p>All content, including but not limited to text, graphics, and logos is the property of ----- or its licensors and is protected by copyright and other intellectual property laws.</p>
        </section>

        <section className="terms-section">
          <h2>6. Limitations of Liability</h2>
          <p>We provide our services "as is" and make no warranties, express or implied. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
        </section>

        <section className="terms-section">
          <h2>7. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our platform.</p>
        </section>

        <section className="terms-section">
          <h2>8. Contact Information</h2>
          <p>For questions about these Terms of Service, please contact us at:</p>
          <p>support@------.com</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService; 