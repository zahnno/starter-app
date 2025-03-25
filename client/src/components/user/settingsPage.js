import React, { useState, useEffect } from 'react';
import { ArrowRight, User, LogOut, Shield, CreditCard, X, ChevronRight, Clock, Check, Star, Gift, BarChart2, Activity, Image, MessageCircle } from "react-feather";
import { NavLink } from "react-router-dom";
import Cookies from "universal-cookie";
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authFetch, catchError } from '../../utils.js';
import { toast } from 'react-toastify';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../config/stripe';
import PaymentForm from '../payments/PaymentForm';

export default function SettingsPage() {
  const cookies = new Cookies();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchSubscriptionDetails = async () => {
    try {
      const [error, data] = await catchError(authFetch({ 
        path: '/subscription/details', 
        method: 'GET' 
      }));
      
      if (error) {
        console.error('Error fetching subscription details:', error);
        toast.error('Failed to fetch subscription details');
        return;
      }
      
      if (data) {
        setSubscriptionDetails(data);
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionDetails:', error);
      toast.error('An unexpected error occurred while fetching subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      if (showModal) {
        try {
          const [error, data] = await catchError(authFetch({ 
            path: '/subscriptions', 
            method: 'GET' 
          }));
          
          if (error) {
            console.error('Error fetching subscription plans:', error);
            toast.error('Failed to fetch subscription plans');
            return;
          }

          if (data) {
            setAvailablePlans(data);
          }
        } catch (error) {
          console.error('Error in fetchPlans:', error);
          toast.error('An unexpected error occurred while fetching subscription plans');
        }
      }
    };

    fetchPlans();
  }, [showModal]);

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      if (!window.confirm('Are you sure you want to cancel your subscription? Your subscription will remain active until the end of your current billing period.')) {
        setLoading(false);
        return;
      }

      const [error] = await catchError(authFetch({
        path: '/subscription/cancel',
        method: 'POST'
      }));

      if (error) throw error;

      toast.success('Your subscription has been cancelled successfully');
      await fetchSubscriptionDetails();
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    // Refresh subscription details
    const [refreshError, refreshData] = await catchError(authFetch({ 
      path: '/subscription/details', 
      method: 'GET' 
    }));
    
    if (refreshData) {
      setSubscriptionDetails(refreshData);
      toast.success('Subscription updated successfully');
    }

    setShowPaymentForm(false);
    setShowModal(false);
  };

  const logout = () => {
    cookies.remove('token', {path: "/"});
    window.location.href = '/settings';
  }

  let settingMenus = [];

  if (user?.role === 'admin') {
    settingMenus.push({
      label: 'Subscription Management',
      link: '/admin/subscriptions',
      icon: <CreditCard size={20} />
    });
    settingMenus.push({
      label: 'Token Transactions',
      link: '/admin/transactions',
      icon: <Activity size={20} />
    });
    settingMenus.push({
      label: 'Cost Analysis',
      link: '/admin/cost-analysis',
      icon: <BarChart2 size={20} />
    });
  }

  const getFeatureIcon = (feature) => {
    if (feature.toLowerCase().includes('image')) return <Image size={16} />;
    if (feature.toLowerCase().includes('chat')) return <MessageCircle size={16} />;
    if (feature.toLowerCase().includes('priority')) return <Star size={16} />;
    if (feature.toLowerCase().includes('early access')) return <Gift size={16} />;
    return <Check size={16} />;
  };

  if (loading) {
    return (
      <div className={`loading-screen ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="loading-content">
          <div className="loading-spinner" />
          <h2>Loading your settings...</h2>
          <p>Please wait while we fetch your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`settings-page ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="settings-container">
        <div className="profile-section-container">
          <div className={`profile-card ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="profile-header">
              <div className="profile-avatar-container">
                <div className={`profile-avatar ${isDarkMode ? 'dark' : 'light'}`}>
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.username}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                    />
                  ) : (
                    <User size={40} strokeWidth={1.5}/>
                  )}
                </div>
              </div>
              { user?.email ? (
                <div className={`user-details ${isDarkMode ? 'dark' : 'light'}`}>
                  <h2>{user?.username || 'User'}</h2>
                  <div className="user-meta-info">
                    <h3>{user?.email}</h3>
                  </div>
                  <div className="user-meta">
                    <div className={`role-badge ${isDarkMode ? 'dark' : 'light'}`}>
                      <Shield size={14} />
                      <span>{user?.role}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`guest-message ${isDarkMode ? 'dark' : 'light'}`}>
                  <h3>Welcome, Guest</h3>
                  <p>Sign in to access additional features</p>
                </div>
              )}
            </div>
          </div>

          {user?.email && (
            <div className={`subscription-card ${isDarkMode ? 'dark' : 'light'}`}>
              <div className="section-title">
                <CreditCard size={16} />
                <span>Subscription</span>
              </div>
              {subscriptionDetails?.subscription?.plan ? (
                <div className={`subscription-info ${isDarkMode ? 'dark' : 'light'}`}>
                  <div className="subscription-header">
                    <span>Current Plan: {subscriptionDetails.subscription.plan.name}</span>
                  </div>
                  <div className="subscription-status">
                    Status: <span className={subscriptionDetails.subscription.status}>{subscriptionDetails.subscription.status}</span>
                  </div>
                  <div className="plan-features">
                    {subscriptionDetails.subscription.plan.displayFeatures?.map((feature, index) => (
                      <div key={index} className="feature-item">
                        {getFeatureIcon(feature)}
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="subscription-expiry">
                    <Clock size={14} />
                    <span>
                      {subscriptionDetails.subscription.status === 'active' 
                        ? `Renews on ${new Date(subscriptionDetails.subscription.endDate).toLocaleDateString()}`
                        : `Expires on ${new Date(subscriptionDetails.subscription.endDate).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                  <button 
                    className={`subscription-manage-button ${isDarkMode ? 'dark' : 'light'}`}
                    onClick={() => setShowModal(true)}
                  >
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <div className={`subscription-info ${isDarkMode ? 'dark' : 'light'}`}>
                  <div className="subscription-header">
                    <span>No Active Subscription</span>
                  </div>
                  <p className="subscription-prompt">
                    Subscribe to unlock AI-powered features and enhance your reading experience.
                  </p>
                  <button 
                    className={`subscription-manage-button ${isDarkMode ? 'dark' : 'light'}`}
                    onClick={() => setShowModal(true)}
                  >
                    View Plans
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <div className={`settings-menu ${isDarkMode ? 'dark' : 'light'}`}>
            <h3 className="settings-section-title">Settings</h3>
            <div className="settings-menu-content">
              { settingMenus.map((menu, index) => (
                <NavLink 
                  key={index} 
                  className={({ isActive }) => `settings-link ${isActive ? 'active' : ''} ${isDarkMode ? 'dark' : 'light'}`} 
                  to={menu.link}
                >
                  <div className="settings-link-content">
                    <div className="settings-link-left">
                      {menu.icon}
                      <span>{menu.label}</span>
                    </div>
                    <ArrowRight size={18} />
                  </div>
                </NavLink>
              ))}
              
              {user?.email && (
                <button className={`logout-button ${isDarkMode ? 'dark' : 'light'}`} onClick={logout}>
                  <LogOut size={20} />
                  <span>Log out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Update the modal JSX */}
      {showModal && (
        <div className={`modal-overlay ${isDarkMode ? 'dark' : 'light'}`}>
          <div className={`subscription-modal ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="modal-header">
              <h2>{showPaymentForm ? 'Complete Subscription' : 'Choose Your Plan'}</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowModal(false);
                  setShowPaymentForm(false);
                }}
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-content">
              {showPaymentForm && selectedPlan ? (
                <Elements stripe={stripePromise}>
                  <PaymentForm 
                    selectedPlan={selectedPlan}
                    email={user.email}
                    onSubscriptionComplete={handlePaymentComplete}
                    onCancel={() => setShowPaymentForm(false)}
                    isDarkMode={isDarkMode}
                  />
                </Elements>
              ) : (
                <div className="plans-grid">
                  {availablePlans.map(plan => (
                    <div 
                      key={plan._id} 
                      className={`plan-option ${
                        subscriptionDetails?.subscription?.plan?._id === plan._id ? 'current' : ''
                      } ${isDarkMode ? 'dark' : 'light'}`}
                    >
                      <div className="plan-info">
                        <h3>{plan.name}</h3>
                        <p className="plan-price">{plan.price === 0 ? 'FREE' : `$${plan.price}/month`}</p>
                        <p className="plan-description">{plan.description}</p>
                        <div className="plan-features">
                          {plan.displayFeatures?.map((feature, index) => (
                            <div key={index} className="feature-item">
                              {getFeatureIcon(feature)}
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button 
                        className={`plan-action-button ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowPaymentForm(true);
                        }}
                        disabled={loading || subscriptionDetails?.subscription?.plan?._id === plan._id}
                      >
                        {subscriptionDetails?.subscription?.plan?._id === plan._id ? 'Current Plan' : 'Select Plan'}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}

                  {subscriptionDetails?.subscription?.plan && (
                    <div className={`cancellation-section ${isDarkMode ? 'dark' : 'light'}`}>
                      <h3>Cancel Subscription</h3>
                      <p>Your subscription will remain active until the end of your current billing period.</p>
                      <button 
                        className={`cancel-subscription-button ${isDarkMode ? 'dark' : 'light'}`}
                        onClick={() => handleCancelSubscription()}
                        disabled={loading}
                      >
                        Cancel My Subscription
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}