import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms of Service - Fun Printing',
  description: 'Read Fun Printing terms of service and conditions. Understand the terms and conditions for using our printing services.',
  keywords: 'terms of service, terms and conditions, fun printing terms',
  url: '/terms',
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

