const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const bcrypt = require('bcrypt');

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Add this constant instead
const LOGO_URL = 'link-to-logo.png';

class EmailService {
  static async generateVerificationToken() {
    // Generate a random string
    const randomString = Math.random().toString(36).substring(2, 15);
    // Hash it
    const salt = await bcrypt.genSalt(10);
    const token = await bcrypt.hash(randomString, salt);
    // Return URL safe token
    return token.replace(/[/+=]/g, '');
  }

  static async sendVerificationEmail(user) {
    // Use hash route for verification link
    const verificationLink = `${process.env.CLIENT_URL}/#/verify-email?token=${user.emailVerificationToken}`;

    const emailParams = {
      Source: process.env.AWS_SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [user.email]
      },
      Message: {
        Subject: {
          Data: 'Verify your email address',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="${LOGO_URL}" alt="App Name! Logo" style="max-width: 200px; height: auto;">
                </div>
                <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Verify Your Email Address</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-bottom: 25px; text-align: center;">
                  Welcome to App Name!! To get started, please verify your email address by clicking the button below:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationLink}" 
                     style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 50px; font-weight: bold;
                            display: inline-block; font-size: 16px; transition: background-color 0.3s ease;">
                    Verify Email Address
                  </a>
                </div>
                <p style="color: #666666; font-size: 14px; margin-top: 25px; text-align: center;">
                  Or copy and paste this link in your browser:
                </p>
                <p style="color: #666666; font-size: 14px; word-break: break-all; text-align: center; margin-bottom: 25px;">
                  ${verificationLink}
                </p>
                <div style="border-top: 1px solid #eeeeee; margin-top: 25px; padding-top: 20px;">
                  <p style="color: #999999; font-size: 12px; text-align: center;">
                    This link will expire in 15 minutes.<br>
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                </div>
              </div>
            `,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const command = new SendEmailCommand(emailParams);
      await sesClient.send(command);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  static async sendPasswordResetEmail(user, resetToken) {
    // Update password reset link to use hash router format
    const resetLink = `${process.env.CLIENT_URL}/#/reset-password?token=${resetToken}`;

    const emailParams = {
      Source: process.env.AWS_SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [user.email]
      },
      Message: {
        Subject: {
          Data: 'Reset your password',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="${LOGO_URL}" alt="App Name Logo" style="max-width: 200px; height: auto;">
                </div>
                <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin-bottom: 25px; text-align: center;">
                  We received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 50px; font-weight: bold;
                            display: inline-block; font-size: 16px; transition: background-color 0.3s ease;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #666666; font-size: 14px; margin-top: 25px; text-align: center;">
                  Or copy and paste this link in your browser:
                </p>
                <p style="color: #666666; font-size: 14px; word-break: break-all; text-align: center; margin-bottom: 25px;">
                  ${resetLink}
                </p>
                <div style="border-top: 1px solid #eeeeee; margin-top: 25px; padding-top: 20px;">
                  <p style="color: #999999; font-size: 12px; text-align: center;">
                    This link will expire in 1 hour.<br>
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </div>
              </div>
            `,
            Charset: 'UTF-8'
          }
        }
      }
    };

    try {
      const command = new SendEmailCommand(emailParams);
      await sesClient.send(command);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

module.exports = EmailService; 