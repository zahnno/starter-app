import React, { useEffect, lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { TokenProvider } from './context/TokenContext';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Styles
import './App.css'
import './styles/toast.css'
import './styles/nav.css'
import './styles/settings.css'

import Navbar from "./components/nav/navbar";
import Header from "./components/nav/header";
import Footer from "./components/nav/Footer";
import HomePage from "./components/homePage";

const RegisterUser = lazy(() => import('./components/user/registerUser'));
const LoginUser = lazy(() => import('./components/user/loginUser'));
const EmailVerification = lazy(() => import('./components/user/EmailVerification'));
const ForgotPassword = lazy(() => import('./components/user/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/user/ResetPassword'));
const SettingsPage = lazy(() => import('./components/user/settingsPage'));

const HelpCenter = lazy(() => import('./components/policies/HelpCenter'));
const AboutUs = lazy(() => import('./components/policies/AboutUs'));
const PrivacyPolicy = lazy(() => import('./components/policies/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/policies/TermsOfService'));

const AppContent = () => {
  const { isDarkMode } = useTheme();

  return (
    <div>
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
        transition={Slide}
        limit={3}
      />
      <Header />
      <Navbar />
      <Suspense fallback={
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterUser />} />
          <Route path="/login" element={<LoginUser />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Static Pages */}
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <TokenProvider>
            <AppContent />
          </TokenProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;