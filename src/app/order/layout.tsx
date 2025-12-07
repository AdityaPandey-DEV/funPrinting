import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Order Printing - Upload Files | Fun Printing',
  description: 'Order professional printing services online. Upload your documents, choose printing options (color/BW, binding), select pickup location, and get fast delivery. Start your print order now!',
  keywords: 'order printing, upload documents, print online, printing order, document printing, print files',
  url: '/order',
});

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

