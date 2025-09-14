import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure email transporter using existing environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_HOST_USER || 'adityapandey.dev.in@gmail.com',
    pass: process.env.EMAIL_HOST_PASSWORD || 'hagbaiwzqltgfflz',
  },
  tls: {
    rejectUnauthorized: false
  }
});

interface VerificationToken {
  token: string;
  email: string;
  timestamp: number;
  expiresAt: number;
}

// Global variable to persist verification tokens across API calls
declare global {
  var emailVerificationStore: Map<string, VerificationToken> | undefined;
}

class EmailVerificationStore {
  private store: Map<string, VerificationToken>;

  constructor() {
    // Use global variable if it exists, otherwise create new
    if (global.emailVerificationStore) {
      this.store = global.emailVerificationStore;
    } else {
      this.store = new Map<string, VerificationToken>();
      global.emailVerificationStore = this.store;
    }

    // Clean up expired tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  // Generate verification token
  generateToken(email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    this.store.set(token, {
      token,
      email,
      timestamp: now,
      expiresAt
    });

    return token;
  }

  // Verify token
  verifyToken(token: string): { valid: boolean; email?: string; error?: string } {
    const tokenData = this.store.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Invalid or expired verification token' };
    }

    if (Date.now() > tokenData.expiresAt) {
      this.store.delete(token);
      return { valid: false, error: 'Verification token has expired' };
    }

    return { valid: true, email: tokenData.email };
  }

  // Remove token after successful verification
  deleteToken(token: string): boolean {
    return this.store.delete(token);
  }

  // Check if token is expired
  isExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }

  // Clean up expired tokens
  private cleanupExpiredTokens(): void {
    for (const [token, data] of this.store.entries()) {
      if (this.isExpired(data.expiresAt)) {
        this.store.delete(token);
      }
    }
  }

  // Get store size for debugging
  getStoreSize(): number {
    return this.store.size;
  }
}

// Export singleton instance
export const emailVerificationStore = new EmailVerificationStore();

// Send verification email
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@printservice.com',
      to: email,
      subject: 'Verify Your Email - Print Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Welcome to Print Service!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #007bff; margin: 0 0 20px 0;">Hi ${name}!</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for signing up with Print Service. To complete your registration and start using our services, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; font-size: 14px; word-break: break-all; margin: 5px 0 0 0;">
              ${verificationUrl}
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This verification link will expire in 24 hours. 
              If you don't verify your email within this time, you'll need to register again.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
            <p>If you didn't create an account with Print Service, please ignore this email.</p>
            <p>This is an automated message, please do not reply.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p>© 2024 Print Service. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
