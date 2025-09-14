 
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const services = [
  {
    title: 'B/W Prints',
    description: 'High-quality black and white printing',
    icon: '🖨️',
    priceKey: 'bw',
  },
  {
    title: 'Color Prints',
    description: 'Vibrant color printing for presentations',
    icon: '🎨',
    priceKey: 'color',
  },
  {
    title: 'Binding',
    description: 'Professional binding services',
    icon: '📚',
    priceKey: 'binding',
  },
  {
    title: 'Resume Templates',
    description: 'Professional resume templates',
    icon: '📄',
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

  const getServicePrice = (priceKey: string) => {
    if (!pricing) return 'Loading...';
    
    switch (priceKey) {
      case 'bw':
        return `₹${pricing.basePrices.A4}/page`;
      case 'color':
        return `₹${pricing.basePrices.A4 * pricing.multipliers.color}/page`;
      case 'binding':
        return `₹${pricing.additionalServices.binding}`;
      case 'resumeTemplate':
        return `₹${pricing.additionalServices.resumeTemplate}`;
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
            Professional Printing Services
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            Fast, reliable, and affordable printing solutions for college students.
            <br />
            Get your documents printed and delivered to your hostel room.
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
              Our Services
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for your academic printing requirements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow border border-gray-200"
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <p className="text-2xl font-bold text-gray-800">{getServicePrice(service.priceKey)}</p>
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
                Why Choose PrintService?
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

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Don&apos;t Wait, Print Today!
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join thousands of students who trust PrintService for their printing needs
          </p>
          <Link
            href="/order"
            className="bg-white text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-block shadow-lg hover:shadow-xl"
          >
            Start Printing Now
          </Link>
        </div>
      </section>
    </div>
  );
}
