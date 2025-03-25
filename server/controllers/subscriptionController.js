const User = require('../models/userModel');
const Subscription = require('../models/subscriptionModel');
const TokenTransaction = require('../models/tokenTransactionModel');
const { handleError } = require('../utils/errorHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { 
  createCustomer, 
  createSubscription: createStripeSubscription,
  updateSubscription: updateStripeSubscription,
  cancelSubscription: cancelStripeSubscription
} = require('../services/stripe');
const CostEstimate = require('../models/costEstimateModel');

// Get all available subscription plans
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Subscription.find({ isActive: true }).sort({ price: 1 });
    
    const formattedPlans = plans.map(plan => ({
      _id: plan._id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      tokensPerMonth: plan.tokensPerMonth,
      tier: plan.tier,
      displayFeatures: plan.displayFeatures
    }));
    
    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Failed to fetch subscription plans' });
  }
};

// Get subscription details
const getSubscriptionDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'subscription.plan',
        model: 'Subscription'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Format the subscription data
    const subscription = user.subscription.plan ? {
      ...user.subscription.toObject(),
      plan: {
        _id: user.subscription.plan._id,
        name: user.subscription.plan.name,
        description: user.subscription.plan.description,
        price: user.subscription.plan.price,
        tokensPerMonth: user.subscription.plan.tokensPerMonth,
        tier: user.subscription.plan.tier,
        displayFeatures: user.subscription.plan.displayFeatures
      }
    } : user.subscription;

    res.json({
      subscription,
      tokenBalance: user.tokenBalance
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Add tokens to user
const addTokens = async (req, res) => {
  try {
    const { tokens, description = 'Manual token addition', metadata } = req.body;
    
    const transaction = await TokenTransaction.createTransaction({
      userId: req.user._id,
      amount: tokens,
      type: 'credit',
      action: 'manual_adjustment',
      description,
      metadata
    });

    res.json({ 
      success: true,
      newBalance: transaction.balance,
      addedTokens: tokens,
      transaction
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Subscribe to plan
const subscribeToPlan = async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;
    const user = await User.findById(req.user._id);
    const plan = await Subscription.findById(planId);

    if (!user || !plan) {
      return res.status(404).json({ message: 'User or plan not found' });
    }

    // Only prevent subscribing to the exact same plan if the subscription is active and it's the same plan
    if (user.subscription?.plan?.toString() === planId && 
        user.subscription?.status === 'active') {
      return res.status(400).json({ message: 'You are already subscribed to this plan' });
    }

    // Handle free tier subscription differently
    if (plan.tier === 'free') {
      // If there's an existing paid subscription, cancel it first
      if (user.subscription?.stripeSubscriptionId && user.subscription.status !== 'cancelled') {
        try {
          await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
        } catch (error) {
          console.log('Error cancelling existing subscription:', error);
          // Continue even if cancellation fails
        }
      }

      // Update user's subscription details for free plan
      user.subscription = {
        plan: plan._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
        status: 'active',
        autoRenew: true
      };
      
      await user.save();

      // Add initial tokens for the free subscription
      const tokenTransaction = await TokenTransaction.createTransaction({
        userId: user._id,
        amount: plan.tokensPerMonth,
        type: 'credit',
        action: 'subscription_purchase',
        description: `Initial tokens from ${plan.name} subscription`,
        relatedEntityId: plan._id,
        relatedEntityModel: 'Subscription',
        metadata: {
          planName: plan.name,
          planTier: plan.tier,
          isInitial: true
        }
      });

      return res.status(200).json({
        message: 'Free subscription activated successfully'
      });
    }

    // For paid plans, continue with existing Stripe logic
    if (!plan.stripePriceId) {
      return res.status(400).json({ message: 'Invalid plan configuration: Missing Stripe Price ID' });
    }

    // If user doesn't have a Stripe customer ID, create one
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethod,
        invoice_settings: { default_payment_method: paymentMethod },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    } else {
      // Update the customer's default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethod },
      });
      
      // Also attach the payment method to the customer if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethod, {
          customer: user.stripeCustomerId,
        });
      } catch (error) {
        // Ignore if payment method is already attached
        if (error.code !== 'resource_already_exists') {
          throw error;
        }
      }
    }

    let stripeSubscription;
    
    // If there's an existing subscription, cancel it first
    if (user.subscription?.stripeSubscriptionId && user.subscription.status !== 'cancelled') {
      try {
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
        // Update the existing subscription status
        user.subscription.status = 'cancelled';
        user.subscription.autoRenew = false;
        await user.save();
      } catch (error) {
        console.log('Error cancelling existing subscription:', error);
        // Continue even if cancellation fails
      }
    }

    // Create new subscription
    stripeSubscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      },
      collection_method: 'charge_automatically',
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: paymentMethod,
      automatic_tax: { enabled: false }
    });

    // Confirm the payment immediately
    if (stripeSubscription.latest_invoice?.payment_intent) {
      const { error: confirmError } = await stripe.paymentIntents.confirm(
        stripeSubscription.latest_invoice.payment_intent.id,
        { payment_method: paymentMethod }
      );

      if (confirmError) {
        throw confirmError;
      }

      // Wait for payment intent to be successful
      const paymentIntent = await stripe.paymentIntents.retrieve(
        stripeSubscription.latest_invoice.payment_intent.id
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Initial payment failed');
      }
    }

    // Update user's subscription details
    user.subscription = {
      ...(user.subscription || {}), // Preserve existing subscription properties
      plan: plan._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      status: 'active',
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: user.stripeCustomerId,
      autoRenew: true // Explicitly set auto-renewal
    };
    
    console.log('Initial subscription details:', {
      userId: user._id,
      subscriptionId: stripeSubscription.id,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate,
      status: user.subscription.status,
      autoRenew: user.subscription.autoRenew
    });
    
    await user.save();

    // Add initial tokens for the subscription
    const tokenTransaction = await TokenTransaction.createTransaction({
      userId: user._id,
      amount: plan.tokensPerMonth,
      type: 'credit',
      action: 'subscription_purchase',
      description: `Initial tokens from ${plan.name} subscription`,
      relatedEntityId: plan._id,
      relatedEntityModel: 'Subscription',
      metadata: {
        planName: plan.name,
        planTier: plan.tier,
        isInitial: true,
        stripeSubscriptionId: stripeSubscription.id
      }
    });

    console.log('Initial token transaction created:', {
      transactionId: tokenTransaction._id,
      amount: tokenTransaction.amount,
      newBalance: tokenTransaction.balance
    });

    // Send a clean, serializable response
    res.status(200).json({
      message: 'Subscription updated successfully',
      clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret || null
    });
  } catch (error) {
    console.error('Subscription error:', error);
    // Send a clean error response
    res.status(500).json({ 
      message: 'An error occurred while processing your subscription',
      error: error.message 
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscription.plan) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    // Cancel Stripe subscription if it exists
    if (user.subscription.stripeSubscriptionId) {
      await cancelStripeSubscription(user.subscription.stripeSubscriptionId);
    }

    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    await user.save();

    res.json({ subscription: user.subscription });
  } catch (error) {
    handleError(res, error);
  }
};

// Create a new subscription plan (admin only)
const createSubscriptionPlan = async (req, res) => {
  try {
    let planData = { ...req.body };

    // Create Stripe product and price if not provided
    if (!planData.stripeProductId || !planData.stripePriceId) {
      // Create product in Stripe
      const product = await stripe.products.create({
        name: planData.name,
        description: planData.description
      });

      // Create price in Stripe
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(planData.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      });

      // Add the Stripe IDs to the plan data
      planData.stripePriceId = price.id;
      planData.stripeProductId = product.id;
    }

    const plan = new Subscription(planData);
    await plan.save();
    
    res.status(201).json({
      message: 'Subscription plan created successfully',
      plan: {
        _id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        tokensPerMonth: plan.tokensPerMonth,
        tier: plan.tier,
        displayFeatures: plan.displayFeatures,
        duration: plan.duration,
        stripePriceId: plan.stripePriceId,
        stripeProductId: plan.stripeProductId,
        isActive: plan.isActive
      }
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    // If there was an error, clean up any created Stripe resources
    if (error.stripeProductId) {
      try {
        await stripe.products.del(error.stripeProductId);
      } catch (cleanupError) {
        console.error('Error cleaning up Stripe product:', cleanupError);
      }
    }
    res.status(500).json({ message: error.message || 'Failed to create subscription plan' });
  }
};

// Update an existing subscription plan (admin only)
const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Subscription.findById(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Create update data with existing Stripe IDs
    const updateData = {
      ...req.body,
      stripePriceId: plan.stripePriceId,  // Will be updated if needed
      stripeProductId: plan.stripeProductId  // Will be updated if needed
    };

    // Check if we need to create or update Stripe product
    let needNewStripeProduct = !plan.stripeProductId;
    
    if (plan.stripeProductId) {
      try {
        // Try to fetch the product to verify it exists
        await stripe.products.retrieve(plan.stripeProductId);
      } catch (stripeError) {
        if (stripeError.code === 'resource_missing') {
          console.log('Stripe product not found, will create new one');
          needNewStripeProduct = true;
        } else {
          throw stripeError;
        }
      }
    }

    // Create new Stripe product if needed
    if (needNewStripeProduct) {
      const product = await stripe.products.create({
        name: req.body.name || plan.name,
        description: req.body.description || plan.description,
        active: plan.isActive
      });
      updateData.stripeProductId = product.id;
      
      // Create initial price since there's no product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round((req.body.price || plan.price) * 100),
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      });
      updateData.stripePriceId = price.id;
    } else {
      // If price changed, create a new price in Stripe
      if (req.body.price && req.body.price !== plan.price) {
        const price = await stripe.prices.create({
          product: plan.stripeProductId,
          unit_amount: Math.round(req.body.price * 100),
          currency: 'usd',
          recurring: {
            interval: 'month'
          }
        });
        updateData.stripePriceId = price.id;
      }

      // If name or description changed, update the Stripe product
      if (req.body.name !== plan.name || req.body.description !== plan.description) {
        await stripe.products.update(plan.stripeProductId, {
          name: req.body.name,
          description: req.body.description
        });
      }
    }

    // Update plan fields
    const updatedPlan = await Subscription.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Subscription plan updated successfully',
      plan: {
        _id: updatedPlan._id,
        name: updatedPlan.name,
        description: updatedPlan.description,
        price: updatedPlan.price,
        tokensPerMonth: updatedPlan.tokensPerMonth,
        tier: updatedPlan.tier,
        stripePriceId: updatedPlan.stripePriceId,
        stripeProductId: updatedPlan.stripeProductId,
        isActive: updatedPlan.isActive
      }
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ message: error.message || 'Failed to update subscription plan' });
  }
};

// Delete a subscription plan (admin only)
const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Subscription.findById(id);
    
    if (!plan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Archive the product in Stripe instead of deleting
    if (plan.stripeProductId) {
      await stripe.products.update(plan.stripeProductId, {
        active: false
      });
    }

    // Instead of actually deleting, we'll set it as inactive
    plan.isActive = false;
    await plan.save();
    
    res.status(200).json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ message: error.message || 'Failed to delete subscription plan' });
  }
};

// Get all subscription plans (including inactive ones) for admin
const getAdminSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Subscription.find().sort({ price: 1 });
    
    const formattedPlans = plans.map(plan => ({
      _id: plan._id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      tokensPerMonth: plan.tokensPerMonth,
      tier: plan.tier,
      isActive: plan.isActive,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
      displayFeatures: plan.displayFeatures,
      duration: plan.duration
    }));
    
    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Failed to fetch subscription plans' });
  }
};

module.exports = {
  getSubscriptionPlans,
  getSubscriptionDetails,
  addTokens,
  subscribeToPlan,
  cancelSubscription,
  // Admin functions
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAdminSubscriptionPlans
}; 