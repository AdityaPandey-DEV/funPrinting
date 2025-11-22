'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setError('');
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-center text-white">
            <div className="text-5xl mb-4">🔑</div>
            <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
            <p className="text-blue-100 text-lg">No worries, we&apos;ll help you reset it</p>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-semibold mb-1">Email sent!</p>
                <p className="text-sm">
                  If an account with that email exists, a password reset link has been sent to your email address.
                  Please check your inbox and click the link to reset your password.
                </p>
                <p className="text-sm mt-2">
                  <strong>Note:</strong> The reset link will expire in 1 hour.
                </p>
              </div>
            )}

            {!success && (
              <>
                <p className="text-gray-600 text-sm">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Info Box */}
            {!success && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Remember your password?</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  If you remember your password, you can sign in directly.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <Link href="/auth/signin" className="block text-sm text-gray-600 hover:text-purple-600 transition-colors">
            Back to sign in →
          </Link>
          {success && (
            <Link href="/auth/signin" className="block text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Go to sign in page
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

