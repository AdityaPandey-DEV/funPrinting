import { Metadata } from 'next';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  locale?: string;
}

/**
 * Get the base URL for the site
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 
         process.env.NEXT_PUBLIC_BASE_URL || 
         'https://www.funprinting.store';
}

/**
 * Generate metadata object for Next.js pages
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const baseUrl = getBaseUrl();
  const siteName = config.siteName || 'Fun Printing';
  const title = config.title 
    ? `${config.title} | ${siteName}`
    : `${siteName} - Professional Printing Services`;
  
  const description = config.description || 
    'Fun Printing offers professional printing services including color prints, B/W prints, binding, and document templates. Fast delivery for college students.';
  
  const keywords = config.keywords || 
    'fun printing, printing service, print shop, document printing, color printing, B/W printing, binding service, printing templates, college printing, student printing';
  
  const image = config.image || `${baseUrl}/fun-printing-printing-service-favicon.jpg`;
  const url = config.url || baseUrl;
  const type = config.type || 'website';

  return {
    title,
    description,
    keywords: keywords.split(',').map(k => k.trim()),
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: type === 'product' ? 'website' : type, // Next.js doesn't support 'product' type, use 'website' instead
      url,
      title,
      description,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: config.locale || 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@funprinting',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'KuALniDwTibP1GXe1WJTPJA66lA0P1VkDiq-IgBDwfg',
    },
  };
}

/**
 * Generate structured data (JSON-LD) for LocalBusiness
 */
export function generateLocalBusinessStructuredData(adminInfo?: {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}) {
  if (!adminInfo) return null;

  const baseUrl = getBaseUrl();

  const openingHours = adminInfo.businessHours 
    ? Object.entries(adminInfo.businessHours)
        .filter(([, hours]) => hours && hours.toLowerCase() !== 'closed')
        .map(([day, hours]) => {
          // Convert day name to schema.org day format
          const dayMap: Record<string, string> = {
            monday: 'Mo',
            tuesday: 'Tu',
            wednesday: 'We',
            thursday: 'Th',
            friday: 'Fr',
            saturday: 'Sa',
            sunday: 'Su',
          };
          return `${dayMap[day.toLowerCase()]} ${hours}`;
        })
    : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: adminInfo.name || 'Fun Printing',
    description: adminInfo.description || 'Professional printing services',
    url: baseUrl,
    telephone: adminInfo.phone,
    email: adminInfo.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: adminInfo.address,
      addressLocality: adminInfo.city,
      addressRegion: adminInfo.state,
      postalCode: adminInfo.pincode,
      addressCountry: adminInfo.country || 'IN',
    },
    ...(openingHours.length > 0 && { openingHours }),
    priceRange: '$$',
    servesCuisine: undefined, // Not applicable
  };
}

/**
 * Generate structured data (JSON-LD) for Organization
 */
export function generateOrganizationStructuredData(adminInfo?: {
  name?: string;
  description?: string;
  website?: string;
  logo?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}) {
  if (!adminInfo) return null;

  const baseUrl = getBaseUrl();
  const sameAs = [
    adminInfo.socialMedia?.facebook,
    adminInfo.socialMedia?.twitter,
    adminInfo.socialMedia?.instagram,
    adminInfo.socialMedia?.linkedin,
    adminInfo.socialMedia?.youtube,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: adminInfo.name || 'Fun Printing',
    description: adminInfo.description || 'Professional printing services',
    url: baseUrl,
    logo: adminInfo.logo || `${baseUrl}/fun-printing-printing-service-favicon.jpg`,
    ...(sameAs.length > 0 && { sameAs }),
  };
}

/**
 * Generate structured data (JSON-LD) for Service
 */
export function generateServiceStructuredData(serviceName: string, description: string) {
  const baseUrl = getBaseUrl();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: serviceName,
    name: serviceName,
    description,
    provider: {
      '@type': 'Organization',
      name: 'Fun Printing',
      url: baseUrl,
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
  };
}

/**
 * Generate structured data (JSON-LD) for BreadcrumbList
 */
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  const baseUrl = getBaseUrl();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate structured data (JSON-LD) for Product (for templates)
 */
export function generateProductStructuredData(product: {
  name: string;
  description: string;
  image?: string;
  price?: number;
  url: string;
  category?: string;
}) {
  const baseUrl = getBaseUrl();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image || `${baseUrl}/fun-printing-printing-service-favicon.jpg`,
    ...(product.price && {
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
    }),
    category: product.category || 'Printing Template',
    url: product.url.startsWith('http') ? product.url : `${baseUrl}${product.url}`,
  };
}

/**
 * Combine multiple structured data objects into a single array
 */
export function combineStructuredData(...data: Array<object | null>): object[] {
  return data.filter((item): item is object => item !== null);
}

