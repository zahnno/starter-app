import React from 'react';
import '../../styles/staticPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="static-page">
      <div className="static-page-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: January 1, 2025</p>

        <section className="policy-section">
          <h2>Introduction</h2>
          <p>------- Inc. ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information when you use our services.</p>
        </section>

        <section className="policy-section">
          <h2>Information We Collect</h2>
          <ul>
            <li>Account information (name, email, password)</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>How We Use Your Information</h2>
          <ul>
            <li>To provide and improve our services</li>
            <li>To process your payments and subscriptions</li>
            <li>To communicate with you about our services</li>
            <li>To ensure the security of our platform</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
        </section>

        <section className="policy-section">
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Contact Us</h2>
          <p>For any privacy-related questions or concerns, please contact us at:</p>
          <p>support@------.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 