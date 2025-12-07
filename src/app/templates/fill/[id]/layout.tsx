import { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/seo';
import connectDB from '@/lib/mongodb';
import DynamicTemplate, { IDynamicTemplate } from '@/models/DynamicTemplate';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    await connectDB();
    const template = await DynamicTemplate.findOne({ id, isPublic: true }).lean() as IDynamicTemplate | null;

    if (template && template.name) {
      return generateSEOMetadata({
        title: `${template.name} - Printing Template | Fun Printing`,
        description: template.description || `Use the ${template.name} template to create professional documents. ${template.category} template available now.`,
        keywords: `${template.name}, ${template.category} template, printing template, document template, fun printing`,
        url: `/templates/fill/${id}`,
        type: 'product',
      });
    }
  } catch (error) {
    console.error('Error generating metadata for template:', error);
  }

  // Fallback metadata
  return generateSEOMetadata({
    title: 'Template - Fun Printing',
    description: 'Professional printing template for creating documents.',
    url: '/templates',
  });
}

export default function TemplateFillLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

