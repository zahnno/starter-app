const express = require("express");
const queryRoutes = express.Router();
const { register, login, lightAuthenticate, authenticate, authenticateAdmin } = require('../controllers/auth');
const { 
  getSubscriptionPlans, 
  getSubscriptionDetails, 
  subscribeToPlan, 
  cancelSubscription, 
} = require('../controllers/subscriptionController');
const { getAdminSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = require('../controllers/subscriptionController');
const TokenTransaction = require('../models/tokenTransactionModel');

queryRoutes.route("/register").post(register);
queryRoutes.route("/login").post(login);
queryRoutes.route("/authenticate").get(authenticate, async(req, res) => {  
  res.json({
    authenticated: true,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    profileImage: req.user.profileImage
  });
});

// Subscription routes
queryRoutes.route("/subscriptions").get(async (req, res) => {
  await getSubscriptionPlans(req, res);
});

queryRoutes.route("/subscription/subscribe").post(authenticate, async (req, res) => {
  await subscribeToPlan(req, res);
});

queryRoutes.route("/subscription/cancel").post(authenticate, async (req, res) => {
  await cancelSubscription(req, res);
});

queryRoutes.route("/subscription/details").get(authenticate, async (req, res) => {
  await getSubscriptionDetails(req, res);
});

// Admin subscription routes
queryRoutes.route("/admin/subscriptions").get(authenticateAdmin, async (req, res) => {
  await getAdminSubscriptionPlans(req, res);
});

queryRoutes.route("/subscription/create").post(authenticateAdmin, async (req, res) => {
  await createSubscriptionPlan(req, res);
});

queryRoutes.route("/subscription/:id/update").post(authenticateAdmin, async (req, res) => {
  await updateSubscriptionPlan(req, res);
});

queryRoutes.route("/subscription/:id/delete").post(authenticateAdmin, async (req, res) => {
  await deleteSubscriptionPlan(req, res);
});

// Token transactions route
queryRoutes.route("/transactions").get(authenticateAdmin, async (req, res) => {
  try {
    // First get all transactions with basic population
    const transactions = await TokenTransaction.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username email')
      .lean(); // Use lean() for better performance since we'll be modifying the objects

    // Get all unique cost estimate IDs from transaction metadata
    const costEstimateIds = transactions
      .filter(t => t.metadata?.costEstimateId)
      .map(t => t.metadata.costEstimateId);

    // Fetch all relevant cost estimates in one query
    const costEstimates = costEstimateIds.length > 0 
      ? await CostEstimate.find({
          _id: { $in: costEstimateIds }
        }).lean()
      : [];

    // Create a map for quick lookups
    const costEstimateMap = new Map(
      costEstimates.map(ce => [ce._id.toString(), ce])
    );

    // Enhance transactions with cost estimate data
    const enhancedTransactions = transactions.map(transaction => {
      if (transaction.metadata?.costEstimateId) {
        const costEstimate = costEstimateMap.get(transaction.metadata.costEstimateId.toString());
        if (costEstimate) {
          return {
            ...transaction,
            metadata: {
              ...transaction.metadata,
              service: costEstimate.service,
              action: costEstimate.action,
              estimatedCost: costEstimate.estimatedCost,
              actualCost: costEstimate.actualCost,
              tokenQuote: costEstimate.tokenQuote,
              status: costEstimate.status,
              parameters: costEstimate.parameters,
              partialTokensUsed: costEstimate.partialTokensUsed
            }
          };
        }
      }
      return transaction;
    });

    res.json(enhancedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch transactions' 
    });
  }
});

module.exports = queryRoutes;