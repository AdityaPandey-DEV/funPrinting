import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ConditionalLayout from '@/components/ConditionalLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PrintService - College Printing Solutions',
  description: 'Professional printing services for college students. Fast, reliable, and affordable printing with delivery to your hostel.',
  verification: {
    google: 'KuALniDwTibP1GXe1WJTPJA66lA0P1VkDiq-IgBDwfg',
  },
<<<<<<< HEAD
  icons: {
    icon: '/fun-printing-printing-service-favicon.jpg',
  },
  openGraph: {
    title: 'PrintService - College Printing Solutions',
    description:
      'Professional printing services for college students. Fast, reliable, and affordable printing with delivery to your hostel.',
    images: ['/fun-printing-printing-service-favicon.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrintService - College Printing Solutions',
    description:
      'Professional printing services for college students. Fast, reliable, and affordable printing with delivery to your hostel.',
    images: ['/fun-printing-printing-service-favicon.jpg'],
  },
=======
>>>>>>> 341729e721aa66ee683edfc9ef97ac328a158377
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
