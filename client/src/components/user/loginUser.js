import React, { useState, useEffect } from 'react'
import { SERVER_URI } from "../../constants.js";
import Cookies from "universal-cookie";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import { Eye, EyeOff, Mail, Lock } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GoogleLogin } from '@react-oauth/google';
import '../../styles/loginUser.css';

export default function LoginUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const cookies = new Cookies();
  const { authenticate } = useAuth();
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  useEffect(() => {
    // Handle OAuth callback
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      cookies.set('token', token, { path: '/' });
      authenticate();
      navigate('/settings');
    }
  }, [location]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      loginUser();
    }
  };

  const loginUser = async () => {
    if (!email) return toast.error('Please provide email.');
    if (!password) return toast.error('Please provide password');

    try {
      const response = await fetch(`${SERVER_URI}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.requiresVerification) {
        setVerificationEmail(email);
        setShowVerification(true);
        toast.info(data.message);
        return;
      }

      if (!response.ok) {
        toast.error(data?.message || "Login failed");
        return;
      }

      cookies.set('token', data.token, { path: '/' });
      
      // Update auth context
      await authenticate();
      
      toast.success('Login successful!');
      
      // Get stored routes
      const postLoginRoute = localStorage.getItem('postLoginRoute');
      const previousRoute = localStorage.getItem('previousRoute');
      
      // Filter out verification and password reset related routes
      let redirectTo = '/settings'; // default route
      if (postLoginRoute && !postLoginRoute.includes('verify-email') && !postLoginRoute.includes('reset-password')) {
        redirectTo = postLoginRoute;
      } else if (previousRoute && !previousRoute.includes('verify-email') && !previousRoute.includes('reset-password')) {
        redirectTo = previousRoute;
      }
      
      // Clear stored routes
      localStorage.removeItem('previousRoute');
      localStorage.removeItem('postLoginRoute');
      
      navigate(redirectTo);
    } catch (error) {
      toast.error(error.message || "An error occurred during login");
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch(`${SERVER_URI}/auth/google/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      if (!response.ok) {
        throw new Error('Google authentication failed');
      }
      
      const data = await response.json();
      cookies.set('token', data.token, { path: '/' });
      await authenticate();
      
      // Check stored routes and filter out verification/reset routes
      const postLoginRoute = localStorage.getItem('postLoginRoute');
      const previousRoute = localStorage.getItem('previousRoute');
      
      let redirectTo = '/settings'; // default route
      if (postLoginRoute && 
          !postLoginRoute.includes('verify-email') && 
          !postLoginRoute.includes('reset-password') &&
          !postLoginRoute.includes('forgot-password')) {
        redirectTo = postLoginRoute;
      } else if (previousRoute && 
                 !previousRoute.includes('verify-email') && 
                 !previousRoute.includes('reset-password') &&
                 !previousRoute.includes('forgot-password')) {
        redirectTo = previousRoute;
      }
      
      // Clear stored routes
      localStorage.removeItem('previousRoute');
      localStorage.removeItem('postLoginRoute');
      
      navigate(redirectTo);
      toast.success('Login successful!');
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Google authentication failed');
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${SERVER_URI}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: verificationEmail })
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

  if (showVerification) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-content">
            <h1 className="login-title">Verify Your Email</h1>
            <p className="login-subtitle">Please check your email and verify your account before logging in.</p>
            
            <div className="verification-instructions">
              <p>We sent a verification link to: {verificationEmail}</p>
              <p>If you don't see the email, check your spam folder.</p>
            </div>

            <div className="login-form">
              <button className="login-button primary" onClick={handleResendVerification}>
                Resend Verification Email
              </button>
              <button className="login-button secondary" onClick={() => setShowVerification(false)}>
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          <div className="login-header">
            <h1 className="login-title">Welcome!</h1>
            <p className="login-subtitle">Sign in or create an account to get started</p>
          </div>

          <div className="login-form">
            <div className="login-form-field">
              <label className="login-label">Email</label>
              <div className="login-input-group">
                <Mail size={18} className="login-input-icon" />
                <input 
                  type="email" 
                  className="login-input"
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>

            <div className="login-form-field">
              <div className="login-password-label">
                <label className="login-label">Password</label>
              </div>
              <div className="login-input-group">
                <Lock size={18} className="login-input-icon" />
                <input 
                  type={isPasswordVisible ? "text" : "password"}
                  className="login-input" 
                  placeholder="Enter your password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button 
                  className="login-visibility-toggle"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  type="button"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <NavLink to="/forgot-password" className="forgot-password-link">
                Forgot your password?
              </NavLink>
            </div>

            <button className="login-button primary" onClick={loginUser}>
              Sign In
            </button>

            <div className="login-divider">
              <span>or continue with</span>
            </div>

            <div className="login-oauth-buttons">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google authentication failed')}
                useOneTap
                theme={isDarkMode ? "filled_black" : "outline"}
                shape="pill"
                text="continue_with"
                width="100%"
              />
            </div>

            <p className="login-footer">
              Don't have an account?{' '}
              <NavLink to="/register" className="login-link">
                Sign up
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}