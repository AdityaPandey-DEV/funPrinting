import { generateLocalBusinessStructuredData, generateOrganizationStructuredData, combineStructuredData } from '@/lib/seo';

interface StructuredDataProps {
  adminInfo?: {
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
    logo?: string;
    businessHours?: {
      monday?: string;
      tuesday?: string;
      wednesday?: string;
      thursday?: string;
      friday?: string;
      saturday?: string;
      sunday?: string;
    };
    socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
  additionalStructuredData?: object[];
}

export default function StructuredData({ adminInfo, additionalStructuredData = [] }: StructuredDataProps) {
  const localBusiness = generateLocalBusinessStructuredData(adminInfo);
  const organization = generateOrganizationStructuredData(adminInfo);
  
  const allStructuredData = combineStructuredData(
    localBusiness,
    organization,
    ...additionalStructuredData
  );

  if (allStructuredData.length === 0) {
    return null;
  }

  return (
    <>
      {allStructuredData.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}

