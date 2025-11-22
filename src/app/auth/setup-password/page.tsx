'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    // Validate password requirements
    setPasswordRequirements({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*]/.test(password),
    });

    // Check if passwords match
    if (confirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  const isPasswordValid = () => {
    return Object.values(passwordRequirements).every(req => req === true) && 
           passwordsMatch && 
           password.length > 0 && 
           confirmPassword.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isPasswordValid()) {
      setError('Please ensure all password requirements are met and passwords match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to check profile or complete profile
        router.push('/auth/check-profile');
      } else {
        setError(data.error || 'Failed to set password. Please try again.');
      }
    } catch (error) {
      console.error('Setup password error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-center text-white">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold mb-2">Set Up Your Password</h1>
            <p className="text-blue-100 text-lg">Create a secure password for your account</p>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                    confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Password Requirements:</p>
                <ul className="space-y-2 text-sm">
                  <li className={`flex items-center ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.minLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasUpperCase ? '✓' : '○'}</span>
                    One uppercase letter (A-Z)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasLowerCase ? '✓' : '○'}</span>
                    One lowercase letter (a-z)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                    One number (0-9)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasSpecialChar ? '✓' : '○'}</span>
                    One special character (!@#$%^&*)
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Setting up password...
                    </span>
                  ) : (
                    'Set Password'
                  )}
                </button>
              </div>
            </form>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Why set a password?</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Sign in with email and password</li>
                <li>Additional security for your account</li>
                <li>Backup login method</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
            Back to sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}

