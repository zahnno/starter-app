import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { SERVER_URI } from '../../constants';

export default function EmailVerification() {
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      console.log('Verification started, token:', token); // Debug log
      
      if (!token) {
        console.log('No token found'); // Debug log
        setVerificationStatus('error');
        return;
      }

      try {
        console.log('Making verification request to:', `${SERVER_URI}/auth/verify-email`); // Debug log
        const response = await fetch(`${SERVER_URI}/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus('success');
          toast.success('Email verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setVerificationStatus('error');
          toast.error(data.message || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error); // Debug log
        setVerificationStatus('error');
        toast.error('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      const response = await fetch(`${SERVER_URI}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent successfully');
      } else {
        toast.error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      toast.error('An error occurred while resending verification email');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-content">
          <h1>Email Verification</h1>
          
          {verificationStatus === 'verifying' && (
            <div className="verification-status">
              <p>Verifying your email...</p>
              <div className="loading-spinner"></div>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="verification-status">
              <p>Your email has been verified successfully!</p>
              <p>Redirecting to login page...</p>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="verification-status error">
              <p>Failed to verify your email. The link may be invalid or expired.</p>
              
              <div className="form-field">
                <div className="input-group">
                  <input 
                    type="email" 
                    placeholder="Enter your email address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </div>

              <button 
                className="auth-button"
                onClick={handleResendVerification}
              >
                Resend Verification Email
              </button>
              <button 
                className="auth-button secondary"
                onClick={() => navigate('/#/login')}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .verification-status {
          text-align: center;
          margin: 20px 0;
        }

        .verification-status.success {
          color: #4CAF50;
        }

        .verification-status.error {
          color: #f44336;
        }

        .form-field {
          margin: 20px 0;
        }

        .input-group {
          margin-top: 8px;
        }

        .auth-input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 16px;
          background: var(--background-secondary);
          color: var(--text-primary);
        }

        .auth-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .loading-spinner {
          border: 4px solid var(--background-secondary);
          border-top: 4px solid var(--accent-color);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .auth-button {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          border: none;
          border-radius: 4px;
          background: var(--accent-color);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .auth-button:hover {
          background: var(--accent-color-hover);
        }

        .auth-button.secondary {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .auth-button.secondary:hover {
          background: var(--background-secondary);
        }
      `}</style>
    </div>
  );
} 