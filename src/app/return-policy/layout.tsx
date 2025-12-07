import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Return Policy - Fun Printing',
  description: 'Read Fun Printing return policy. Learn about our return and exchange policies for printing services.',
  keywords: 'return policy, printing returns, document returns',
  url: '/return-policy',
});

export default function ReturnPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

