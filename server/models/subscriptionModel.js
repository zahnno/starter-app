const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: Number, // Duration in days
      required: true,
      min: 1
    },
    tokensPerMonth: {
      type: Number,
      required: true,
      min: 0
    },
    displayFeatures: [{
      type: String,
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    stripePriceId: {
      type: String,
      required: false // Temporarily make this optional
    },
    stripeProductId: {
      type: String,
      required: false // Temporarily make this optional
    },
    tier: {
      type: String,
      enum: ['free', 'basic', 'standard', 'premium', 'enterprise'],
      required: true
    }
  },
  { timestamps: true }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 