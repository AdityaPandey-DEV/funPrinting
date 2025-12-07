import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ConditionalLayout from '@/components/ConditionalLayout';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });

// Generate optimized metadata with target keywords
export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: 'Fun Printing - Professional Printing Services',
    description: 'Fun Printing offers professional printing services including color prints, B/W prints, binding, and document templates. Fast delivery for college students. Order now for quick and affordable printing solutions.',
    keywords: 'fun printing, printing service, print shop, document printing, color printing, B/W printing, binding service, printing templates, college printing, student printing, online printing, print online',
    image: '/fun-printing-printing-service-favicon.jpg',
    siteName: 'Fun Printing',
  }),
  icons: {
    icon: '/fun-printing-printing-service-favicon.jpg',
    shortcut: '/fun-printing-printing-service-favicon.jpg',
    apple: '/fun-printing-printing-service-favicon.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.funprinting.store'} />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
