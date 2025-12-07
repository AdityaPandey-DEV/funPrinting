import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'My Orders - Track Printing Orders | Fun Printing',
  description: 'Track your printing orders, view order status, download documents, and manage your printing history. Check the status of your print orders with Fun Printing.',
  keywords: 'my orders, track orders, order status, printing orders, order history',
  url: '/my-orders',
});

export default function MyOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

