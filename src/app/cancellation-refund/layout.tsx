import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Cancellation & Refund Policy - Fun Printing',
  description: 'Read Fun Printing cancellation and refund policy. Learn how to cancel orders and get refunds for printing services.',
  keywords: 'cancellation policy, refund policy, order cancellation, printing refund',
  url: '/cancellation-refund',
});

export default function CancellationRefundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

