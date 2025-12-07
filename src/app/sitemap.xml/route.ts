import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DynamicTemplate from '@/models/DynamicTemplate';

export async function GET() {
  // Use www.funprinting.store as preferred domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.funprinting.store';
  
  // Ensure URL doesn't have trailing slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Static pages
  const staticPages = [
    {
      url: `${cleanBaseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${cleanBaseUrl}/order`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${cleanBaseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${cleanBaseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${cleanBaseUrl}/my-orders`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${cleanBaseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${cleanBaseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${cleanBaseUrl}/shipping-delivery`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${cleanBaseUrl}/cancellation-refund`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${cleanBaseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // Fetch dynamic templates from database
  let templatePages: Array<{
    url: string;
    lastModified: Date;
    changeFrequency: 'weekly' | 'monthly';
    priority: number;
  }> = [];

  try {
    await connectDB();
    const templates = await DynamicTemplate.find({ 
      isPublic: true 
    }).select('id updatedAt createdAt').lean();
    
    templatePages = templates.map((template) => ({
      url: `${cleanBaseUrl}/templates/fill/${template.id}`,
      lastModified: template.updatedAt ? new Date(template.updatedAt) : new Date(template.createdAt || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching templates for sitemap:', error);
    // Continue without template pages if there's an error
  }

  // Combine all pages
  const allPages = [...staticPages, ...templatePages];

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified.toISOString()}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
