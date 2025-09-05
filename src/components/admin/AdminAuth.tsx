'use client';

import { useState } from 'react';

interface AdminAuthProps {
  onLogin: () => void;
  title?: string;
  subtitle?: string;
}

export default function AdminAuth({ onLogin, title = "Admin Login", subtitle = "Access the admin dashboard" }: AdminAuthProps) {
  const [loginCredentials, setLoginCredentials] = useState({
    email: '',
    password: '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCredentials.email === 'admin@printservice.com' && loginCredentials.password === 'admin123') {
      onLogin();
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {subtitle}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input rounded-t-md"
                placeholder="Email address"
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input rounded-b-md"
                placeholder="Password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
