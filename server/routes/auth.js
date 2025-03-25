const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel');
const EmailService = require('../services/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google token from client
router.post('/google/verify', async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    // Find or create user
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        email: payload.email,
        username: payload.name,
        googleId: payload.sub,
        profileImage: payload.picture
      });
    }

    // Handle free tier subscription differently
    if (user.subscription?.plan && user.subscription?.plan?.tier === 'free' && user.subscription?.endDate < new Date()) {
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
      await TokenTransaction.createTransaction({
        userId: user._id,
        amount: plan.tokensPerMonth,
        type: 'credit',
        action: 'subscription_purchase',
        description: `Expired free renewal. Initial tokens from ${plan.name} subscription`,
        relatedEntityId: plan._id,
        relatedEntityModel: 'Subscription',
        metadata: {
          planName: plan.name,
          planTier: plan.tier,
          isInitial: true
        }
      });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: '23 hours'
    });
    
    res.json({ token });
  } catch (error) {
    console.error('Google verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Email verification routes
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate and save new verification token
    const verificationToken = await EmailService.generateVerificationToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Send verification email
    await EmailService.sendVerificationEmail(user);

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error resending verification:', error);
    res.status(500).json({ message: 'Error sending verification email' });
  }
});

// Password reset routes
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent Google OAuth users from resetting password
    if (user.googleId) {
      return res.status(400).json({ 
        message: 'This account uses Google Sign-In. Please reset your password through Google.'
      });
    }

    // Generate reset token
    const resetToken = await EmailService.generateVerificationToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email
    await EmailService.sendPasswordResetEmail(user, resetToken);

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'Error sending password reset email' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired password reset token'
      });
    }

    // Prevent Google OAuth users from resetting password
    if (user.googleId) {
      return res.status(400).json({ 
        message: 'This account uses Google Sign-In. Please reset your password through Google.'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router; 