const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/userModel');
const Subscription = require('../models/subscriptionModel');
const TokenTransaction = require('../models/tokenTransactionModel');

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    // Log all incoming webhook events
    console.log('\nWebhook received:', {
      type: event.type,
      id: event.id,
      object: event.data.object.object,
      // If it's a subscription-related event, log the subscription ID
      subscriptionId: event.data.object.subscription || event.data.object.id,
      // If it's an invoice, log the billing reason
      billingReason: event.data.object.billing_reason,
      // If test clock is present, log it
      testClock: event.data.object.test_clock || null
    });

    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleSuccessfulPayment(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handleFailedPayment(failedInvoice);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;

      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        await handleSubscriptionCancellation(cancelledSubscription);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

async function handleSuccessfulPayment(invoice) {
  if (!invoice.subscription) {
    console.log('Webhook: Skipping - Not a subscription payment');
    return;
  }

  try {
    console.log('Webhook: Processing payment for subscription:', invoice.subscription);
    console.log('Webhook: Payment status:', invoice.status);
    console.log('Webhook: Billing reason:', invoice.billing_reason);
    
    // Only process if payment was successful
    if (invoice.status !== 'paid') {
      console.log('Webhook: Skipping - Invoice not paid. Status:', invoice.status);
      return;
    }

    const user = await User.findOne({ 'subscription.stripeSubscriptionId': invoice.subscription });
    if (!user) {
      console.log('Webhook: Skipping - User not found for subscription:', invoice.subscription);
      return;
    }

    const plan = await Subscription.findById(user.subscription.plan);
    if (!plan) {
      console.log('Webhook: Skipping - Plan not found for user:', user._id);
      return;
    }

    // Handle different billing scenarios
    switch (invoice.billing_reason) {
      case 'subscription_cycle':
        // Regular renewal
        console.log('Webhook: Processing renewal payment');
        await handleRenewalPayment(user, plan, invoice);
        break;
      
      case 'subscription_create':
        // Initial subscription - tokens already added during subscription creation
        console.log('Webhook: Skipping token addition for initial subscription');
        break;
      
      case 'subscription_update':
        // Plan change
        console.log('Webhook: Processing plan change payment');
        await handlePlanChangePayment(user, plan, invoice);
        break;
      
      default:
        console.log('Webhook: Unhandled billing reason:', invoice.billing_reason);
        return;
    }

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleRenewalPayment(user, plan, invoice) {
  // Update subscription dates
  user.subscription.startDate = new Date(invoice.period_start * 1000);
  user.subscription.endDate = new Date(invoice.period_end * 1000);
  user.subscription.status = 'active';
  
  console.log('Webhook: Updated subscription dates:', {
    startDate: user.subscription.startDate,
    endDate: user.subscription.endDate
  });

  // Add renewal tokens
  const tokenTransaction = await TokenTransaction.createTransaction({
    userId: user._id,
    amount: plan.tokensPerMonth,
    type: 'credit',
    action: 'subscription_renewal',
    description: `Monthly renewal tokens from ${plan.name} subscription`,
    relatedEntityId: plan._id,
    relatedEntityModel: 'Subscription',
    metadata: {
      planName: plan.name,
      planTier: plan.tier,
      isInitial: false,
      stripeSubscriptionId: invoice.subscription,
      invoiceId: invoice.id
    }
  });

  console.log('Webhook: Created renewal token transaction:', {
    transactionId: tokenTransaction._id,
    amount: tokenTransaction.amount,
    newBalance: tokenTransaction.balance
  });

  await user.save();
}

async function handlePlanChangePayment(user, plan, invoice) {
  // Update subscription dates
  user.subscription.startDate = new Date(invoice.period_start * 1000);
  user.subscription.endDate = new Date(invoice.period_end * 1000);
  user.subscription.status = 'active';
  
  console.log('Webhook: Updated subscription dates for plan change:', {
    startDate: user.subscription.startDate,
    endDate: user.subscription.endDate
  });

  // Add tokens for the new plan
  const tokenTransaction = await TokenTransaction.createTransaction({
    userId: user._id,
    amount: plan.tokensPerMonth,
    type: 'credit',
    action: 'subscription_plan_change',
    description: `Tokens from upgrading to ${plan.name} subscription`,
    relatedEntityId: plan._id,
    relatedEntityModel: 'Subscription',
    metadata: {
      planName: plan.name,
      planTier: plan.tier,
      isInitial: false,
      stripeSubscriptionId: invoice.subscription,
      invoiceId: invoice.id
    }
  });

  console.log('Webhook: Created plan change token transaction:', {
    transactionId: tokenTransaction._id,
    amount: tokenTransaction.amount,
    newBalance: tokenTransaction.balance
  });

  await user.save();
}

async function handleFailedPayment(invoice) {
  if (!invoice.subscription) {
    console.log('Webhook: Skipping failed payment - Not a subscription payment');
    return;
  }

  try {
    console.log('Webhook: Processing failed payment for subscription:', invoice.subscription);
    
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': invoice.subscription });
    if (!user) {
      console.log('Webhook: Skipping - User not found for subscription:', invoice.subscription);
      return;
    }

    console.log('Webhook: Found user for failed payment:', user._id);

    // Update subscription status to reflect payment failure
    user.subscription.status = 'past_due';
    user.subscription.autoRenew = false; // Disable auto-renewal on payment failure

    // If this is after multiple retries (final attempt), cancel the subscription
    if (invoice.next_payment_attempt === null) {
      console.log('Webhook: Final payment attempt failed, cancelling subscription');
      user.subscription.status = 'cancelled';
      
      // Cancel the subscription in Stripe
      try {
        await stripe.subscriptions.cancel(invoice.subscription);
      } catch (stripeError) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with local cancellation even if Stripe call fails
      }
    } else {
      console.log('Webhook: Payment retry scheduled for:', new Date(invoice.next_payment_attempt * 1000));
    }

    await user.save();
    console.log('Webhook: Updated user subscription status to:', user.subscription.status);
  } catch (error) {
    console.error('Error handling failed payment:', error);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription) {
  try {
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
    if (!user) return;

    console.log('Webhook: Processing subscription update:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    // Only update basic subscription properties
    // Do NOT update dates or add tokens here - that's handled by invoice.payment_succeeded
    user.subscription.status = subscription.status;

    await user.save();
    console.log('Webhook: Updated subscription status to:', subscription.status);
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription) {
  console.log('Webhook: Processing subscription cancellation:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  if (!user) return;

  user.subscription.status = 'cancelled';
  user.subscription.autoRenew = false;
  
  await user.save();
}

module.exports = router; 