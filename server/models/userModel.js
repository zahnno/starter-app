const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Subscription = require('./subscriptionModel');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    profileImage: {
      type: String,
      default: null
    },
    password: {
      type: String,
      required: function() {
        return !this.googleId && !this.auth0Id; // Only required if not using OAuth
      }
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true
    },
    role: {
      type: String,
      enum: ['user', 'reader', 'admin'],
      default: 'reader',
      required: true
    },
    subscription: {
      plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
      },
      startDate: Date,
      endDate: Date,
      status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'pending', 'past_due', 'none'],
        default: 'pending'
      },
      stripeCustomerId: String,
      stripeSubscriptionId: String
    },
    tokenBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    lastTokenRefresh: {
      type: Date
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  { timestamps: true }
);

// Only hash password if it's being modified and exists
userSchema.pre('save', async function(next) {
  if (this.password && (this.isModified('password') || this.isNew)) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Assign free tier subscription to new users
userSchema.pre('save', async function(next) {
  try {
    // Only proceed if this is a new user or subscription is not set
    if (this.isNew || !this.subscription.plan) {
      // Find the free tier subscription plan
      const freePlan = await Subscription.findOne({ tier: 'free', isActive: true });
      
      if (freePlan) {
        // Set up the free subscription
        this.subscription = {
          plan: freePlan._id,
          startDate: new Date(),
          endDate: new Date(Date.now() + freePlan.duration * 24 * 60 * 60 * 1000),
          status: 'active',
          autoRenew: true
        };
        
        // Set initial token balance from the free plan
        this.tokenBalance = freePlan.tokensPerMonth;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Compare the given password with the hashed password in the database
userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if user has enough tokens
userSchema.methods.hasEnoughTokens = function(amount) {
  return this.tokenBalance >= amount;
};

// Method to check if subscription is active
userSchema.methods.hasActiveSubscription = function() {
  if (!this.subscription.plan) return false;
  const now = new Date();
  return (
    this.subscription.status === 'active' &&
    this.subscription.endDate > now
  );
};

// Enable virtuals when converting to JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;