import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Printing Templates - Professional Documents | Fun Printing',
  description: 'Browse and use professional printing templates for assignments, reports, certificates, lab manuals, and more. Create professional documents with our easy-to-use template system.',
  keywords: 'printing templates, document templates, assignment template, report template, certificate template, lab manual template',
  url: '/templates',
});

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

