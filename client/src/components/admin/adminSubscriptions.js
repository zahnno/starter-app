import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, CreditCard, Zap, Package, Save } from 'react-feather';
import { useTheme } from '../../context/ThemeContext';
import { authFetch, catchError } from '../../utils.js';
import { toast } from 'react-toastify';

export default function AdminSubscriptionsPage() {
  const { isDarkMode } = useTheme();
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    tokensPerMonth: 0,
    tier: 'basic',
    duration: 30,
    displayFeatures: [],
    isActive: true,
    stripePriceId: '',
    stripeProductId: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const [error, data] = await catchError(authFetch({ 
      path: '/admin/subscriptions', 
      method: 'GET' 
    }));
    if (data) {
      setPlans(data);
    }
    if (error) {
      console.error('Failed to fetch subscription plans');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const path = editingPlan ? `/subscription/${editingPlan._id}/update` : '/subscription/create';
      const [error, data] = await catchError(authFetch({
        path,
        method: 'POST',
        body: {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          tokensPerMonth: formData.tokensPerMonth,
          tier: formData.tier,
          duration: formData.duration,
          displayFeatures: formData.displayFeatures,
          isActive: formData.isActive,
          stripePriceId: formData.stripePriceId,
          stripeProductId: formData.stripeProductId
        }
      }));

      if (error) throw new Error(error.message);
      
      toast.success(`Subscription plan ${editingPlan ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      fetchPlans();
    } catch (error) {
      toast.error(error.message || `Failed to ${editingPlan ? 'update' : 'create'} subscription plan`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    
    try {
      const [error, data] = await catchError(authFetch({
        path: `/subscription/${planId}/delete`,
        method: 'POST'
      }));

      if (error) throw new Error(error.message);
      
      toast.success('Subscription plan deleted successfully');
      fetchPlans();
    } catch (error) {
      toast.error(error.message || 'Failed to delete subscription plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      tokensPerMonth: plan.tokensPerMonth,
      tier: plan.tier,
      duration: plan.duration || 30,
      displayFeatures: plan.displayFeatures || [],
      isActive: plan.isActive,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId
    });
    setShowModal(true);
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      tokensPerMonth: 0,
      tier: 'basic',
      duration: 30,
      displayFeatures: [],
      isActive: true,
      stripePriceId: '',
      stripeProductId: ''
    });
    setShowModal(true);
  };

  const NewPlanForm = ({ onSubmit, onCancel, initialData }) => {
    const [formData, setFormData] = useState(initialData || {
      name: '',
      description: '',
      price: 0,
      tokensPerMonth: 0,
      tier: 'basic',
      duration: 30,
      displayFeatures: [],
      isActive: true,
      stripePriceId: '',
      stripeProductId: ''
    });

    const [newFeature, setNewFeature] = useState('');

    useEffect(() => {
      if (initialData) {
        setFormData(initialData);
      }
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
      }));
    };

    const handleAddFeature = (e) => {
      e.preventDefault();
      if (newFeature.trim()) {
        setFormData(prev => ({
          ...prev,
          displayFeatures: [...prev.displayFeatures, newFeature.trim()]
        }));
        setNewFeature('');
      }
    };

    const handleRemoveFeature = (index) => {
      setFormData(prev => ({
        ...prev,
        displayFeatures: prev.displayFeatures.filter((_, i) => i !== index)
      }));
    };

    const handleFormSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleFormSubmit} className="subscription-form">
        <input
          type="hidden"
          name="stripePriceId"
          value={formData.stripePriceId || ''}
        />
        <input
          type="hidden"
          name="stripeProductId"
          value={formData.stripeProductId || ''}
        />

        <div className="form-group">
          <label htmlFor="name">Plan Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price (USD/month)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokensPerMonth">Monthly Tokens</label>
            <input
              id="tokensPerMonth"
              name="tokensPerMonth"
              type="number"
              min="0"
              value={formData.tokensPerMonth}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tier">Tier</label>
            <select
              id="tier"
              name="tier"
              value={formData.tier}
              onChange={handleChange}
              required
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (days)</label>
            <input
              id="duration"
              name="duration"
              type="number"
              min="1"
              value={formData.duration}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3>
            <Package size={20} />
            Display Features
          </h3>
          <div className="features-list">
            {formData.displayFeatures.map((feature, index) => (
              <div key={index} className="feature-item">
                <span>{feature}</span>
                <button
                  type="button"
                  className="remove-feature"
                  onClick={() => handleRemoveFeature(index)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-feature">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a new feature..."
            />
            <button type="button" onClick={handleAddFeature}>
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        <div className="stripe-info form-section">
          <h3>
            <CreditCard size={20} />
            Stripe Information
          </h3>
          <div className="stripe-details">
            <div className="stripe-field">
              <label>Price ID:</label>
              <code>{formData.stripePriceId || 'Not set'}</code>
            </div>
            <div className="stripe-field">
              <label>Product ID:</label>
              <code>{formData.stripeProductId || 'Not set'}</code>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            <Save size={18} />
            {initialData ? 'Update Plan' : 'Create Plan'}
          </button>
          <button type="button" className="cancel-button" onClick={onCancel}>
            <X size={18} />
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className={`admin-page ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="admin-header">
        <h1>Subscription Plans</h1>
        <button 
          className="add-button"
          onClick={handleAddPlan}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="plans-grid">
        {plans.map(plan => (
          <div key={plan._id} className={`plan-card ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="plan-header">
              <h2>{plan.name}</h2>
              <div className={`plan-tier ${plan.tier}`}>
                {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
              </div>
            </div>
            <div className="plan-price">${plan.price}/month</div>
            <div className="plan-tokens">
              <Zap size={16} />
              {plan.tokensPerMonth} tokens per month
            </div>
            <p className="plan-description">{plan.description}</p>
            <div className="plan-features">
              {plan.displayFeatures?.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="stripe-info">
              <div className="stripe-id">
                <CreditCard size={14} />
                <span>Price ID: </span>
                <code>{plan.stripePriceId || 'Not set'}</code>
              </div>
              <div className="stripe-id">
                <Package size={14} />
                <span>Product ID: </span>
                <code>{plan.stripeProductId || 'Not set'}</code>
              </div>
            </div>
            <div className="plan-actions">
              <button 
                className="edit-button"
                onClick={() => handleEdit(plan)}
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button 
                className="delete-button"
                onClick={() => handleDelete(plan._id)}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className={`modal-overlay ${isDarkMode ? 'dark' : 'light'}`}>
          <div className={`subscription-modal ${isDarkMode ? 'dark' : 'light'}`}>
            <div className="modal-header">
              <h2>{editingPlan ? 'Edit Plan' : 'New Plan'}</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>
            
            <NewPlanForm
              onSubmit={handleSubmit}
              onCancel={() => setShowModal(false)}
              initialData={editingPlan ? formData : null}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .stripe-info {
          margin-top: 15px;
          padding: 10px;
          background: ${isDarkMode ? '#2a2a2a' : '#f5f5f5'};
          border-radius: 4px;
          font-size: 0.85em;
        }

        .stripe-id {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .stripe-id:last-child {
          margin-bottom: 0;
        }

        .stripe-id code {
          background: ${isDarkMode ? '#1a1a1a' : '#fff'};
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
          color: ${isDarkMode ? '#00d4ff' : '#0066cc'};
          word-break: break-all;
        }

        .stripe-id span {
          color: ${isDarkMode ? '#aaa' : '#666'};
          font-weight: 500;
        }

        .plan-card {
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: 8px;
          background: ${isDarkMode ? '#2a2a2a' : '#fff'};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .plan-description {
          margin: 10px 0;
          color: ${isDarkMode ? '#aaa' : '#666'};
        }

        .plan-actions {
          margin-top: auto;
          display: flex;
          gap: 10px;
        }

        .plan-features {
          margin: 15px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .feature-item {
          padding: 6px 12px;
          background: ${isDarkMode ? '#1a1a1a' : '#f5f5f5'};
          border-radius: 4px;
          font-size: 0.9em;
          color: ${isDarkMode ? '#ddd' : '#666'};
        }

        .features-list {
          margin: 10px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .remove-feature {
          background: none;
          border: none;
          color: ${isDarkMode ? '#ff4444' : '#cc0000'};
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .add-feature {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .add-feature input {
          flex: 1;
          padding: 8px;
          border: 1px solid ${isDarkMode ? '#444' : '#ddd'};
          border-radius: 4px;
          background: ${isDarkMode ? '#1a1a1a' : '#fff'};
          color: ${isDarkMode ? '#fff' : '#000'};
        }

        .add-feature button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: ${isDarkMode ? '#2a2a2a' : '#f0f0f0'};
          border: 1px solid ${isDarkMode ? '#444' : '#ddd'};
          border-radius: 4px;
          cursor: pointer;
          color: ${isDarkMode ? '#fff' : '#000'};
        }
      `}</style>
    </div>
  );
} 