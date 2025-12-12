 
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { generateLocalBusinessStructuredData, generateOrganizationStructuredData, generateServiceStructuredData, combineStructuredData } from '@/lib/seo';
import { PrinterIcon, PaletteIcon, BookIcon, DocumentIcon, MoneyIcon, DollarIcon, RocketIcon, MemoIcon } from '@/components/SocialIcons';

const services = [
  {
    title: 'B/W Prints',
    description: 'High-quality black and white printing',
    icon: PrinterIcon,
    priceKey: 'bw',
  },
  {
    title: 'Color Prints',
    description: 'Vibrant color printing for presentations',
    icon: PaletteIcon,
    priceKey: 'color',
  },
  {
    title: 'Binding',
    description: 'Professional binding services',
    icon: BookIcon,
    priceKey: 'binding',
  },
  {
    title: 'Templates',
    description: 'Professional document templates',
    icon: DocumentIcon,
    priceKey: 'resumeTemplate',
  },
];

export default function Home() {
  const [pricing, setPricing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/pricing');
        const data = await response.json();
        
        if (data.success) {
          setPricing(data.pricing);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, []);

  // Inject structured data for SEO
  useEffect(() => {
    const injectStructuredData = async () => {
      try {
        // Fetch admin info for structured data
        const adminResponse = await fetch('/api/admin/info');
        const adminData = await adminResponse.json();
        const adminInfo = adminData.success ? adminData.admin : null;

        // Generate structured data
        const localBusiness = generateLocalBusinessStructuredData(adminInfo);
        const organization = generateOrganizationStructuredData(adminInfo);
        const bwService = generateServiceStructuredData(
          'Black and White Printing',
          'High-quality black and white printing services for documents, assignments, and reports'
        );
        const colorService = generateServiceStructuredData(
          'Color Printing',
          'Vibrant color printing services for presentations, posters, and marketing materials'
        );
        const bindingService = generateServiceStructuredData(
          'Document Binding',
          'Professional binding services for reports, thesis, and documents'
        );

        const allStructuredData = combineStructuredData(
          localBusiness,
          organization,
          bwService,
          colorService,
          bindingService
        );

        // Remove existing structured data scripts
        const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-seo="true"]');
        existingScripts.forEach(script => script.remove());

        // Inject new structured data
        allStructuredData.forEach((data, index) => {
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.setAttribute('data-seo', 'true');
          script.id = `structured-data-${index}`;
          script.textContent = JSON.stringify(data);
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('Error injecting structured data:', error);
      }
    };

    injectStructuredData();
  }, []);

  const getServicePrice = (priceKey: string) => {
    if (!pricing) return 'Loading...';
    
    switch (priceKey) {
      case 'bw':
        const originalBwPrice = pricing.basePrices.A4 * 2; // Original price (double current)
        const discountedBwPrice = pricing.basePrices.A4; // Current price (50% off)
        return (
          <div className="flex flex-col items-center">
            <span className="text-lg text-gray-400 line-through">₹{originalBwPrice}/page</span>
            <span className="text-2xl font-bold text-green-600">₹{discountedBwPrice}/page</span>
            <span className="text-xs text-green-600 font-medium">50% OFF!</span>
          </div>
        );
      case 'color':
        const originalColorPrice = (pricing.basePrices.A4 * pricing.multipliers.color) * 2; // Original price (double current)
        const discountedColorPrice = pricing.basePrices.A4 * pricing.multipliers.color; // Current price (50% off)
        return (
          <div className="flex flex-col items-center">
            <span className="text-lg text-gray-400 line-through">₹{originalColorPrice}/page</span>
            <span className="text-2xl font-bold text-green-600">₹{discountedColorPrice}/page</span>
            <span className="text-xs text-green-600 font-medium">50% OFF!</span>
          </div>
        );
      case 'binding':
        const originalBindingPrice = pricing.additionalServices.binding * 2; // Original price (double current)
        const discountedBindingPrice = pricing.additionalServices.binding; // Current price (50% off)
        return (
          <div className="flex flex-col items-center">
            <span className="text-lg text-gray-400 line-through">₹{originalBindingPrice}</span>
            <span className="text-2xl font-bold text-green-600">₹{discountedBindingPrice}</span>
            <span className="text-xs text-green-600 font-medium">50% OFF!</span>
          </div>
        );
      case 'resumeTemplate':
        const originalTemplatePrice = 100; // Original price
        return (
          <div className="flex flex-col items-center">
            <span className="text-lg text-gray-400 line-through">₹{originalTemplatePrice}</span>
            <span className="text-2xl font-bold text-green-600">Free</span>
            <span className="text-xs text-green-600 font-medium">100% OFF!</span>
          </div>
        );
      default:
        return 'N/A';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Professional Printing Service
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            Your trusted printing service for fast, reliable, and affordable printing solutions. 
            <br />
            Get your documents printed and delivered to your hostel room with our professional printing service.
          </p>
          <Link
            href="/order"
            className="bg-white text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-block shadow-lg hover:shadow-xl"
          >
            Order Now
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Printing Services
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for your academic printing requirements - professional printing service at your fingertips
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow border border-gray-800 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-black text-white text-xs font-bold px-3 py-1 transform rotate-45 translate-x-6 -translate-y-1">
                  OFFER
                </div>
                <div className="flex justify-center mb-4">
                  <service.icon size={48} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <div className="text-2xl font-bold text-gray-800">{getServicePrice(service.priceKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose Professional Printing Service?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-black rounded-full flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
                    <p className="text-gray-600">Get your prints delivered to your hostel within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-black rounded-full flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quality Guaranteed</h3>
                    <p className="text-gray-600">Professional printing quality with satisfaction guarantee</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-black rounded-full flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure Payment</h3>
                    <p className="text-gray-600">Safe and secure payment through Razorpay</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-8 text-white text-center shadow-xl">
                <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                <p className="mb-6">Upload your documents or choose from our professional templates</p>
                <div className="space-y-3">
                  <Link
                    href="/order"
                    className="block w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Upload & Print
                  </Link>
                  <Link
                    href="/templates"
                    className="block w-full bg-transparent border-2 border-white text-white py-3 px-6 rounded-lg font-semibold hover:bg-white hover:text-black transition-colors"
                  >
                    Browse Templates
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Earn Money Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border-2 border-green-200">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <MoneyIcon size={64} className="w-16 h-16" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Earn Money by Creating Templates!
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Turn your document templates into a passive income stream. Create once, earn every time someone uses your template.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6 border border-green-200">
                <div className="flex justify-center mb-3">
                  <MemoIcon size={32} className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Templates</h3>
                <p className="text-gray-600 text-sm">
                  Upload your DOCX templates with placeholders. Set your own price and start earning.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200">
                <div className="flex justify-center mb-3">
                  <DollarIcon size={32} className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn Passive Income</h3>
                <p className="text-gray-600 text-sm">
                  Get paid every time someone purchases your template. Track earnings in real-time.
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg p-6 border border-purple-200">
                <div className="flex justify-center mb-3">
                  <RocketIcon size={32} className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Payouts</h3>
                <p className="text-gray-600 text-sm">
                  Receive payments directly to your UPI or bank account. Fast and secure transfers.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">1</div>
                  <p className="text-sm font-medium text-gray-900">Create Template</p>
                  <p className="text-xs text-gray-600 mt-1">Upload your DOCX file</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">2</div>
                  <p className="text-sm font-medium text-gray-900">Set Price</p>
                  <p className="text-xs text-gray-600 mt-1">Choose your earning amount</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">3</div>
                  <p className="text-sm font-medium text-gray-900">Get Discovered</p>
                  <p className="text-xs text-gray-600 mt-1">Users find and buy your template</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">4</div>
                  <p className="text-sm font-medium text-gray-900">Earn Money</p>
                  <p className="text-xs text-gray-600 mt-1">Receive payments automatically</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/templates/create"
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all inline-block shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center justify-center gap-2">
                  <PaletteIcon size={20} className="w-5 h-5" />
                  Start Creating Templates & Earn
                </span>
              </Link>
              <p className="text-sm text-gray-500 mt-4">
                Already have templates? <Link href="/my-templates" className="text-green-600 hover:text-green-700 font-medium underline">Manage your templates</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Don&apos;t Wait, Print Today!
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join thousands of students who trust Fun Printing for their printing service needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/order"
              className="bg-white text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-block shadow-lg hover:shadow-xl"
            >
              Start Printing Now
            </Link>
            <Link
              href="/templates/create"
              className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors inline-block shadow-lg hover:shadow-xl"
            >
              Create Templates & Earn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
