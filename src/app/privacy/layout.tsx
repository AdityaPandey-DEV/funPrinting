import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy - Fun Printing',
  description: 'Read Fun Printing privacy policy to understand how we collect, use, and protect your personal information. Your privacy is important to us.',
  keywords: 'privacy policy, data protection, privacy, fun printing privacy',
  url: '/privacy',
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

