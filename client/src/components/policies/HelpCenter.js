import React from 'react';
import '../../styles/staticPages.css';

const HelpCenter = () => {
  return (
    <div className="static-page">
      <div className="static-page-content">
        <h1>Help Center</h1>
        
        <section className="help-section">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>How do I get started?</h3>
            <p>Create an account.</p>
          </div>

          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards through our secure payment processor, Stripe.</p>
          </div>
        </section>

        <section className="help-section">
          <h2>Contact Support</h2>
          <p>Need more help? Contact our support team:</p>
          <ul>
            <li>Email: support@----.com</li>
            <li>Response time: Within 24 hours</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpCenter; 