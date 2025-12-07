import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Contact Us - Fun Printing',
  description: 'Get in touch with Fun Printing for printing services, support, or inquiries. Contact us via phone, email, or visit our location. We are here to help with all your printing needs.',
  keywords: 'contact fun printing, printing service contact, customer support, printing help',
  url: '/contact',
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

