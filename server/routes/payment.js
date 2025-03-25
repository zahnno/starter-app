const express = require('express');
const router = express.Router();
const { 
  createCustomer, 
  createSubscription, 
  updateSubscription, 
  cancelSubscription,
  retrieveCustomer,
  listSubscriptions 
} = require('../services/stripe');
const User = require('../models/userModel');

// Create a customer and initiate subscription
router.post('/create-subscription', async (req, res) => {
  try {
    const { email, paymentMethod, priceId } = req.body;
    
    // Create a customer
    const customer = await createCustomer(email, paymentMethod);
    
    // Create a subscription
    const subscription = await createSubscription(customer.id, priceId);
    
    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      customerId: customer.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.post('/update-subscription', async (req, res) => {
  try {
    const { subscriptionId, newPriceId } = req.body;
    const subscription = await updateSubscription(subscriptionId, newPriceId);
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const subscription = await cancelSubscription(subscriptionId);

    // Update user's subscription in our database
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId });
    if (user) {
      user.subscription.status = 'cancelled';
      user.subscription.autoRenew = false;
      await user.save();
    }

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer subscriptions
router.get('/subscriptions/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const subscriptions = await listSubscriptions(customerId);
    res.json({ subscriptions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer details
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await retrieveCustomer(customerId);
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 