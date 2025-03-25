import React, { useState } from 'react'
import { SERVER_URI } from "../../constants.js";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff } from 'react-feather';

export default function RegisterUser() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const registerUser = async () => {
    if (!email) return toast.error('Please provide email.');
    if (!password) return toast.error('Please provide password');
    if (password.length < 6) return toast.error('Password must be at least 6 characters long');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    
    try {
      const response = await fetch(`${SERVER_URI}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data?.message || "Unknown Error Occurred");
        return;
      }

      if (data.requiresVerification) {
        // Store email for verification resend functionality
        localStorage.setItem('pendingVerificationEmail', email);
        setVerificationSent(true);
        toast.success(data.message);
      } else {
        toast.success(`Hello ${email}! Sign up successful!`);
        // Keep the original previousRoute in localStorage when redirecting to login
        const previousRoute = localStorage.getItem('previousRoute');
        if (previousRoute) {
          localStorage.setItem('postLoginRoute', previousRoute);
        }
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.message || "An error occurred during registration");
    }
  }

  const handleResendVerification = async () => {
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

  if (verificationSent) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-content">
            <h1>Check Your Email</h1>
            <p className="auth-subtitle">We've sent a verification link to your email address.</p>
            
            <div className="verification-instructions">
              <p>Please check your email and click the verification link to complete your registration.</p>
              <p>If you don't see the email, check your spam folder.</p>
            </div>

            <div className="auth-buttons">
              <button className="auth-button" onClick={handleResendVerification}>
                Resend Verification Email
              </button>
              <button className="auth-button secondary" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-content">
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join our community!</p>

          <div className="auth-form">
            <div className="form-field">
              <label>Email</label>
              <div className="input-group">
                <Mail size={18} />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-field">
              <label>Password</label>
              <div className="input-group">
                <Lock size={18} />
                <input 
                  type={isPasswordVisible ? "text" : "password"} 
                  placeholder="Create a password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button 
                  className="visibility-toggle"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  type="button"
                >
                  {isPasswordVisible ? <EyeOff size={18} style={{ left: '-15px' }} /> : <Eye size={18} style={{ left: '-15px' }} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>Confirm Password</label>
              <div className="input-group">
                <Lock size={18} />
                <input 
                  type={isConfirmPasswordVisible ? "text" : "password"} 
                  placeholder="Confirm your password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
                <button 
                  className="visibility-toggle"
                  onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  type="button"
                >
                  {isConfirmPasswordVisible ? <EyeOff size={18} style={{ left: '-15px' }} /> : <Eye size={18} style={{ left: '-15px' }} />}
                </button>
              </div>
            </div>

            <div className="auth-buttons">
              <button className="auth-button" onClick={registerUser}>
                Create Account
              </button>
              <button className="auth-button secondary" onClick={() => navigate(-1)}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}