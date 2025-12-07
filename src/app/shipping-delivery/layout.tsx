import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Shipping & Delivery - Fun Printing',
  description: 'Learn about Fun Printing shipping and delivery options. Fast delivery to your location, pickup options, and delivery charges. Get your printed documents quickly.',
  keywords: 'shipping, delivery, printing delivery, document delivery, pickup location',
  url: '/shipping-delivery',
});

export default function ShippingDeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

