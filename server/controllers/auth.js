const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const EmailService = require('../services/emailService');

const { validateEmail, validatePassword } = require('../services/validation');

// Register a new user
const register = async (req, res, next) => {
  const { email, password } = req.body;
  if (!validateEmail(email)) return res.status(400).json({ message: 'Invalid email' });
  if (!validatePassword(password)) return res.status(400).json({ message: 'Invalid password' });
  
  try {
    // Check for existing email
    const emailUser = await User.findOne({ email });
    const users = await User.find();
    console.log(users);
    if (emailUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Generate verification token
    const verificationToken = await EmailService.generateVerificationToken();
    
    // Create new user with verification token
    const user = new User({
      email,
      password,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 15 * 60 * 1000 // 15 minutes
    });
    await user.save();

    // Send verification email
    await EmailService.sendVerificationEmail(user);

    res.json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      requiresVerification: true
    });
  } catch (error) {
    console.log(error);
    // Handle MongoDB duplicate key errors explicitly
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      return res.status(400).json({ message: 'Duplicate value detected' });
    }
    next(error);
  }
};

// Login with an existing user
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate('subscription.plan');
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    // Check if user was created with Google authentication
    if (user.googleId) {
      return res.status(400).json({ 
        message: 'This email is associated with a Google account. Please sign in with Google.'
      });
    }
    
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) return res.status(401).json({ message: 'Incorrect password' });

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in',
        requiresVerification: true
      });
    }

    // // Handle free tier subscription differently
    // if (user.subscription?.plan && user.subscription?.plan?.tier === 'free' && user.subscription?.endDate < new Date()) {
    //   // Update user's subscription details for free plan
    //   user.subscription = {
    //     plan: plan._id,
    //     startDate: new Date(),
    //     endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
    //     status: 'active',
    //     autoRenew: true
    //   };
      
    //   await user.save();

    //   // Add initial tokens for the free subscription
    //   await TokenTransaction.createTransaction({
    //     userId: user._id,
    //     amount: plan.tokensPerMonth,
    //     type: 'credit',
    //     action: 'subscription_purchase',
    //     description: `Expired free renewal. Initial tokens from ${plan.name} subscription`,
    //     relatedEntityId: plan._id,
    //     relatedEntityModel: 'Subscription',
    //     metadata: {
    //       planName: plan.name,
    //       planTier: plan.tier,
    //       isInitial: true
    //     }
    //   });
    // }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: '23 hours'
    });

    res.json({ token });
  } catch (error) {
    next(error);
  }
};

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Please sign in.' });
  }
};

const lightAuthenticate = async(req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decodedToken.userId);
    if (!user) return next();

    req.user = user;
    return next();
  } catch (error) {
    // If token verification fails, just continue without user
    return next();
  }
};

const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role != 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please sign in.' });
  }
};

module.exports = { 
  register, 
  login, 
  lightAuthenticate, 
  authenticate, 
  authenticateAdmin, 
};