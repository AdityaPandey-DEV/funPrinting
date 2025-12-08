'use client';

import Link from 'next/link';

interface AdminNavigationProps {
  currentPage?: string;
  showBackButton?: boolean;
  backUrl?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminNavigation({ 
  currentPage,
  showBackButton = false,
  backUrl = '/admin',
  title,
  subtitle,
  actions
}: AdminNavigationProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          {showBackButton && (
            <Link
              href={backUrl}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </Link>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-2">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Common admin card component
interface AdminCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  count?: number;
  className?: string;
}

export function AdminCard({ icon, title, description, href, count, className = "" }: AdminCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center">{icon}</div>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        {count !== undefined ? (
          <span className="text-gray-800 text-sm font-medium">
            {count} {title.toLowerCase()}
          </span>
        ) : (
          <Link
            href={href}
            className="text-gray-800 hover:text-black text-sm font-medium transition-colors"
          >
            Manage {title} →
          </Link>
        )}
      </div>
    </div>
  );
}
