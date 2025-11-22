import crypto from 'crypto';

interface ResetToken {
  token: string;
  email: string;
  timestamp: number;
  expiresAt: number;
}

// Global variable to persist reset tokens across API calls
declare global {
  var passwordResetStore: Map<string, ResetToken> | undefined;
}

class PasswordResetStore {
  private store: Map<string, ResetToken>;

  constructor() {
    // Use global variable if it exists, otherwise create new
    if (global.passwordResetStore) {
      this.store = global.passwordResetStore;
    } else {
      this.store = new Map<string, ResetToken>();
      global.passwordResetStore = this.store;
    }

    // Clean up expired tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  // Generate reset token
  generateToken(email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (60 * 60 * 1000); // 1 hour

    this.store.set(token, {
      token,
      email: email.toLowerCase().trim(),
      timestamp: now,
      expiresAt
    });

    return token;
  }

  // Verify token
  verifyToken(token: string): { valid: boolean; email?: string; error?: string } {
    const tokenData = this.store.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Invalid or expired reset token' };
    }

    if (Date.now() > tokenData.expiresAt) {
      this.store.delete(token);
      return { valid: false, error: 'Reset token has expired' };
    }

    return { valid: true, email: tokenData.email };
  }

  // Remove token after successful reset (single-use)
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
export const passwordResetStore = new PasswordResetStore();

