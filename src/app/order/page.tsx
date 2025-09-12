'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';

interface PrintingOptions {
  pageSize: 'A4' | 'A3';
  color: 'color' | 'bw' | 'mixed';
  sided: 'single' | 'double';
  copies: number;
  serviceOption: 'binding' | 'file' | 'service';
  pageColors?: {
    colorPages: number[];
    bwPages: number[];
  };
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface DeliveryOption {
  type: 'pickup' | 'delivery';
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  distance?: number;
  deliveryCharge?: number;
  address?: string;
  city?: string;
  pinCode?: string;
  pickupLocationId?: string;
}

interface PickupLocation {
  _id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  gmapLink?: string;
}

// Helper functions for page color selection
const parsePageRange = (input: string, maxPages?: number): number[] => {
  if (!input || !input.trim()) return [];
  
  try {
    const pages: number[] = [];
    const parts = input.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue; // Skip empty parts
      
      if (trimmed.includes('-')) {
        // Handle range like "5-8"
        const rangeParts = trimmed.split('-');
        if (rangeParts.length === 2) {
          const start = parseInt(rangeParts[0].trim());
          const end = parseInt(rangeParts[1].trim());
          if (!isNaN(start) && !isNaN(end) && start <= end && start > 0) {
            for (let i = start; i <= end; i++) {
              // Only add pages that are within the valid range
              if (!maxPages || i <= maxPages) {
                pages.push(i);
              }
            }
          }
        }
      } else {
        // Handle single page
        const page = parseInt(trimmed);
        if (!isNaN(page) && page > 0 && (!maxPages || page <= maxPages)) {
          pages.push(page);
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(pages)].sort((a, b) => a - b);
  } catch (error) {
    console.error('Error parsing page range:', error);
    return [];
  }
};

const generateBwPages = (totalPages: number, colorPages: number[]): number[] => {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return allPages.filter(page => !colorPages.includes(page));
};

const getPageColorPreview = (totalPages: number, pageColors?: { colorPages: number[]; bwPages: number[] }): string => {
  if (!pageColors) return 'All pages in Black & White';
  
  const colorCount = pageColors.colorPages.length;
  const bwCount = pageColors.bwPages.length;
  
  if (colorCount === 0) return 'All pages in Black & White';
  if (bwCount === 0) return 'All pages in Color';
  
  return `${colorCount} pages in Color, ${bwCount} pages in Black & White`;
};

export default function OrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded: isRazorpayLoaded, error: razorpayError, openRazorpay } = useRazorpay();
  const { user, isAuthenticated } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: File upload and preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileURL, setFileURL] = useState<string>('');
  const [orderType, setOrderType] = useState<'file' | 'template'>('file');
  const [printingOptions, setPrintingOptions] = useState<PrintingOptions>({
    pageSize: 'A4',
    color: 'bw',
    sided: 'single',
    copies: 1,
    serviceOption: 'service',
    pageColors: {
      colorPages: [],
      bwPages: [],
    },
  });
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [pageCount, setPageCount] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  
  // Step 2: Details, delivery, and payment
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
  });
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>({ type: 'pickup' });
  const [showMapModal, setShowMapModal] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<PickupLocation | null>(null);
  const [colorPagesInput, setColorPagesInput] = useState<string>('');

  // Update customer info when user authentication changes
  useEffect(() => {
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);
  
  
  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [pricingData, setPricingData] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  
  // Debug: Log pricingData changes
  useEffect(() => {
    console.log('🔍 PricingData updated:', pricingData);
  }, [pricingData]);
  
  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Pickup locations
  const [defaultPickupLocation, setDefaultPickupLocation] = useState<{
    _id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    gmapLink?: string;
  } | null>(null);

  // Check for pending order from custom template workflow
  useEffect(() => {
    const pendingOrder = sessionStorage.getItem('pendingOrder');
    if (pendingOrder) {
      try {
        const orderData = JSON.parse(pendingOrder);
        console.log('📋 Found pending order from custom template:', orderData);
        
        // Set the order type to template
        setOrderType('template');
        
        // Set the PDF URL for preview
        setPdfUrl(orderData.pdfUrl);
        setPdfLoaded(true);
        
        // Set customer info from the form data
        if (orderData.customerData) {
          setCustomerInfo({
            name: orderData.customerData.name || orderData.customerData.studentName || '',
            email: orderData.customerData.email || '',
            phone: orderData.customerData.phone || orderData.customerData.mobile || ''
          });
        }
        
        // Set page count to 1 for template orders (will be updated based on actual PDF)
        setPageCount(1);
        
        // Clear the pending order from session storage
        sessionStorage.removeItem('pendingOrder');
        
        console.log('✅ Pending order loaded successfully');
      } catch (error) {
        console.error('Error loading pending order:', error);
        sessionStorage.removeItem('pendingOrder');
      }
    }
  }, []);

  // Fetch pickup locations
  useEffect(() => {
    const fetchPickupLocations = async () => {
      try {
        const response = await fetch('/api/pickup-locations');
        const data = await response.json();
        
        if (data.success) {
          setPickupLocations(data.locations || []);
          setDefaultPickupLocation(data.defaultLocation);
          
          // Set default pickup location as selected
          if (data.defaultLocation) {
            setSelectedPickupLocation(data.defaultLocation);
            setDeliveryOption(prev => ({
              ...prev,
              pickupLocationId: data.defaultLocation._id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching pickup locations:', error);
      }
    };

    fetchPickupLocations();
  }, []);

  // Calculate amount based on printing options and delivery
  useEffect(() => {
    const calculateAmount = async () => {
      console.log('🔄 Pricing calculation triggered:', { pageCount, copies: printingOptions.copies });
      // Always run pricing calculation to show base prices, even with default values
      if (printingOptions.copies > 0) {
        try {
          setPricingLoading(true);
          // Fetch pricing from API
          console.log('🔍 Fetching pricing from API...');
          const response = await fetch('/api/pricing');
          const data = await response.json();
          
          console.log('📊 Pricing API response:', data);
          
          if (data.success) {
            const pricing = data.pricing;
            setPricingData(pricing); // Store pricing data for UI display
            setPricingLoading(false);
            
            // Base price per page
            const basePrice = pricing.basePrices[printingOptions.pageSize];
            console.log(`💰 Base price for ${printingOptions.pageSize}: ₹${basePrice}`);
            
            // Calculate color costs for mixed pages
            let total = 0;
            if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
              // Mixed color pricing: calculate separately for color and B&W pages
              const colorPages = printingOptions.pageColors.colorPages.length;
              const bwPages = printingOptions.pageColors.bwPages.length;
              
              const colorCost = basePrice * colorPages * pricing.multipliers.color;
              const bwCost = basePrice * bwPages;
              
              total = (colorCost + bwCost) * (printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1) * printingOptions.copies;
            } else {
              // Standard pricing for all color or all B&W
              const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
              const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
              
              total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
            }
            
            // Add compulsory service option cost (only for multi-page jobs)
            if (pageCount > 1) {
              if (printingOptions.serviceOption === 'binding') {
                total += pricing.additionalServices.binding;
              } else if (printingOptions.serviceOption === 'file') {
                total += 10; // Plastic file fee (keep pages inside file)
              } else if (printingOptions.serviceOption === 'service') {
                total += 5; // Minimal service fee
              }
            }
            
            // Add delivery charge if applicable
            if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
              total += deliveryOption.deliveryCharge;
            }
            
            console.log(`💰 Frontend pricing calculation:`, {
              pageCount,
              basePrice,
              color: printingOptions.color,
              sided: printingOptions.sided,
              copies: printingOptions.copies,
              serviceOption: printingOptions.serviceOption,
              total
            });
            
            setAmount(total);
          } else {
            console.error('❌ Pricing API failed:', data.error);
            console.log('🔄 Using fallback pricing...');
            setPricingLoading(false);
            // Fallback to hardcoded pricing if API fails
            const basePrice = printingOptions.pageSize === 'A3' ? 10 : 5;
            console.log(`💰 Fallback base price for ${printingOptions.pageSize}: ₹${basePrice}`);
            
            let total = 0;
            if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
              // Mixed color pricing fallback
              const colorPages = printingOptions.pageColors.colorPages.length;
              const bwPages = printingOptions.pageColors.bwPages.length;
              
              const colorCost = basePrice * colorPages * 2; // 2x multiplier for color
              const bwCost = basePrice * bwPages;
              
              total = (colorCost + bwCost) * (printingOptions.sided === 'double' ? 1.5 : 1) * printingOptions.copies;
            } else {
              // Standard pricing fallback
              const colorMultiplier = printingOptions.color === 'color' ? 2 : 1;
              const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
              
              total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
            }
            
            // Add compulsory service option cost (fallback amounts, only if multi-page)
            if (pageCount > 1) {
              if (printingOptions.serviceOption === 'binding') {
                total += 20; // Default binding cost
              } else if (printingOptions.serviceOption === 'file') {
                total += 10;
              } else if (printingOptions.serviceOption === 'service') {
                total += 5;
              }
            }
            
            if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
              total += deliveryOption.deliveryCharge;
            }
            
            console.log(`💰 Frontend fallback pricing calculation:`, {
              pageCount,
              basePrice,
              color: printingOptions.color,
              sided: printingOptions.sided,
              copies: printingOptions.copies,
              serviceOption: printingOptions.serviceOption,
              total
            });
            
            setAmount(total);
          }
        } catch (error) {
          console.error('❌ Error fetching pricing:', error);
          console.log('🔄 Using fallback pricing due to error...');
          // Fallback to hardcoded pricing
          const basePrice = printingOptions.pageSize === 'A3' ? 10 : 5;
          console.log(`💰 Fallback base price for ${printingOptions.pageSize}: ₹${basePrice}`);
          
          let total = 0;
          if (printingOptions.color === 'mixed' && printingOptions.pageColors) {
            // Mixed color pricing fallback
            const colorPages = printingOptions.pageColors.colorPages.length;
            const bwPages = printingOptions.pageColors.bwPages.length;
            
            const colorCost = basePrice * colorPages * 2; // 2x multiplier for color
            const bwCost = basePrice * bwPages;
            
            total = (colorCost + bwCost) * (printingOptions.sided === 'double' ? 1.5 : 1) * printingOptions.copies;
          } else {
            // Standard pricing fallback
            const colorMultiplier = printingOptions.color === 'color' ? 2 : 1;
            const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
            
            total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
          }
          
          if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
            total += deliveryOption.deliveryCharge;
          }
          
          console.log(`💰 Frontend error fallback pricing calculation:`, {
            pageCount,
            basePrice,
            color: printingOptions.color,
            sided: printingOptions.sided,
            copies: printingOptions.copies,
            serviceOption: printingOptions.serviceOption,
            total
          });
          
          setAmount(total);
        }
      } else {
        // Reset amount if copies is invalid
        console.log('🔄 Resetting amount - copies is 0 or invalid');
        setAmount(0);
      }
    };

    calculateAmount();
  }, [pageCount, printingOptions, deliveryOption]);


  // Payment function
  const handlePayment = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      alert('Please sign in to place an order. You can sign in or create an account to continue.');
      return;
    }

    // Check if Razorpay is loaded
    if (!isRazorpayLoaded) {
      alert('Payment gateway is still loading. Please wait a moment and try again.');
      return;
    }

    if (razorpayError) {
      alert(`Payment gateway error: ${razorpayError}`);
      return;
    }

    // Validate service option for multi-page orders
    if (pageCount > 1 && !printingOptions.serviceOption) {
      alert('Please select a service option (Binding, Plastic file, or Service fee) for multi-page orders');
      return;
    }

    // Validate mixed color page selection
    if (printingOptions.color === 'mixed' && (!printingOptions.pageColors || printingOptions.pageColors.colorPages.length === 0)) {
      alert('Please select which pages should be printed in color');
      return;
    }

    // Validate expected date
    if (!expectedDate) {
      alert('Please select an expected delivery date');
      return;
    }

    // Validate pickup location if pickup is selected
    if (deliveryOption.type === 'pickup' && !deliveryOption.pickupLocationId) {
      alert('Please select a pickup location');
      return;
    }

    setIsProcessingPayment(true);
    try {
      
      // First, upload file if it's a file order
      let fileURL, fileType, originalFileName;
      if (selectedFile && orderType === 'file') {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', selectedFile);
          
          const uploadResponse = await fetch('/api/upload-file', {
            method: 'POST',
            body: uploadFormData,
          });
          
          // Check if response is ok before trying to parse JSON
          if (!uploadResponse.ok) {
            let errorMessage = 'Upload failed';
            try {
              const errorData = await uploadResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
              // If we can't parse JSON, it might be an HTML error page from Vercel
              if (uploadResponse.status === 413) {
                errorMessage = 'File size too large. Please try a smaller file.';
              } else if (uploadResponse.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
              } else {
                errorMessage = `Upload failed with status ${uploadResponse.status}`;
              }
            }
            throw new Error(errorMessage);
          }
          
          const uploadData = await uploadResponse.json();
          
          if (uploadData.success) {
            fileURL = uploadData.fileURL;
            fileType = uploadData.fileType;
            originalFileName = uploadData.originalFileName;
            console.log(`✅ File uploaded successfully: ${fileURL}`);
          } else {
            throw new Error(uploadData.error || 'Upload failed');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.';
          alert(`Upload Error: ${errorMessage}`);
          setIsProcessingPayment(false);
          return;
        }
      }

      // Prepare order data for payment initiation
      const orderData = {
        customerInfo,
        orderType,
        fileURL: orderType === 'file' ? fileURL : undefined,
        fileType: orderType === 'file' ? fileType : undefined,
        originalFileName: orderType === 'file' ? originalFileName : undefined,
        templateData: orderType === 'template' ? {
          templateType: 'custom',
          formData: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
          }
        } : undefined,
        printingOptions: {
          ...printingOptions,
          pageCount,
        },
        deliveryOption,
        expectedDate,
      };

      console.log('🔍 Initiating payment with order data:', orderData);

      // Initiate payment (this will NOT create order in database yet)
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        // Show order ID immediately
        if (data.orderId) {
          alert(`📋 Order #${data.orderId} created! Please complete payment to confirm your order.`);
        }

        // Initialize Razorpay payment
        const options = {
          key: data.key,
          amount: data.amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          name: 'College Print Service',
          description: `Print Order Payment - Order #${data.orderId || 'N/A'}`,
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            try {
              console.log('💳 Payment response received:', response);
              
              // Verify payment and create order on backend
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyResponse.json();
              console.log('🔍 Payment verification response:', verifyData);

              if (verifyData.success) {
                alert(`🎉 Payment successful! Your order #${verifyData.order.orderId} has been placed.`);
                // Redirect to my orders page
                window.location.href = '/my-orders';
              } else {
                console.error('Payment verification failed:', verifyData.error);
                alert(`❌ Payment verification failed: ${verifyData.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('Error verifying payment:', error);
              alert('❌ Payment verification failed. Please contact support.');
            }
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
              // Clean up temporary order data
              if (data.razorpayOrderId) {
                fetch('/api/payment/cleanup', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    razorpay_order_id: data.razorpayOrderId,
                  }),
                }).catch(cleanupError => {
                  console.error('Error cleaning up payment data:', cleanupError);
                });
              }
              setIsProcessingPayment(false);
            }
          },
          callback_url: window.location.origin + '/payment-callback',
          prefill: {
            name: customerInfo.name,
            email: customerInfo.email,
            contact: customerInfo.phone,
          },
          theme: {
            color: '#000000',
          },
        };

        const razorpay = openRazorpay(options);
        razorpay.open();
      } else {
        alert(`Failed to create order: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Place Your Print Order</h1>
          <p className="text-lg text-gray-600">
            Upload your documents or choose from our templates and get them printed
          </p>
        </div>

        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 1 ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Upload & Preview</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-black' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 2 ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Details & Payment</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
          {currentStep === 1 ? (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Upload & Preview</h2>
                <p className="text-gray-600">Upload your document and preview how it will look when printed</p>
              </div>

              {/* Order Type Selection */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Order Type</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orderType"
                      value="file"
                      checked={orderType === 'file'}
                      onChange={(e) => setOrderType(e.target.value as 'file' | 'template')}
                      className="mr-2"
                    />
                    Upload File
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orderType"
                      value="template"
                      checked={orderType === 'template'}
                      onChange={() => {
                        // Redirect to templates page with notification
                        alert('📝 To use templates: 1) Go to Templates page, 2) Fill the form with your information, 3) Download the document, 4) Convert to PDF, 5) Come back here to order it!');
                        window.location.href = '/templates';
                      }}
                      className="mr-2"
                    />
                    Use Template
                  </label>
                </div>
              </div>

              {/* File Upload */}
              {orderType === 'file' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload File</h3>
                  <div className="form-file-upload">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.rtf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setPdfLoaded(false);
                          
                          // Create preview URL
                          const url = URL.createObjectURL(file);
                          setPdfUrl(url);
                          
                          // Detect page count properly using pdf-lib
                          if (file.type === 'application/pdf') {
                            // Read the PDF and get actual page count
                            const arrayBuffer = await file.arrayBuffer();
                            try {
                              const { PDFDocument } = await import('pdf-lib');
                              const pdfDoc = await PDFDocument.load(arrayBuffer);
                              const actualPageCount = pdfDoc.getPageCount();
                              console.log(`📄 Actual PDF page count: ${actualPageCount}`);
                              setPageCount(actualPageCount);
                            } catch (error) {
                              console.error('Error reading PDF page count:', error);
                              // Fallback to estimation if pdf-lib fails
                              const estimatedPages = Math.max(1, Math.floor(file.size / 50000));
                              console.log(`📄 Fallback estimated page count: ${estimatedPages}`);
                              setPageCount(estimatedPages);
                            }
                          } else {
                            setPageCount(1);
                          }
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Choose File
                    </button>
                    {selectedFile && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* File Preview */}
              {pdfUrl && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h3>
                  <div className={`border rounded-lg overflow-hidden ${printingOptions.color === 'bw' ? 'grayscale' : ''}`}>
                    {!pdfLoaded && (
                      <div className="h-96 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading preview...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Show different preview based on file type */}
                    {selectedFile && (
                      <>
                        {/* Image files - show directly */}
                        {selectedFile.type.startsWith('image/') && (
                          <img
                            src={pdfUrl}
                            alt="Document preview"
                            className="w-full h-96 object-contain"
                            onLoad={() => setPdfLoaded(true)}
                            style={{ display: pdfLoaded ? 'block' : 'none' }}
                          />
                        )}
                        
                        {/* PDF files - use iframe */}
                        {selectedFile.type === 'application/pdf' && (
                          <iframe
                            src={pdfUrl}
                            className="w-full h-96"
                            onLoad={() => setPdfLoaded(true)}
                            style={{ display: pdfLoaded ? 'block' : 'none' }}
                          />
                        )}
                        
                        {/* Text files - show as text */}
                        {selectedFile.type.startsWith('text/') && (
                          <div className="w-full h-96 overflow-auto p-4 bg-white">
                            <pre className="text-sm whitespace-pre-wrap">
                              {/* Text content will be loaded here */}
                              <div className="text-center text-gray-500">
                                Text file preview will be available after upload
                              </div>
                            </pre>
                          </div>
                        )}
                        
                        {/* Other files - show file info */}
                        {!selectedFile.type.startsWith('image/') && 
                         selectedFile.type !== 'application/pdf' && 
                         !selectedFile.type.startsWith('text/') && (
                          <div className="w-full h-96 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <div className="text-6xl mb-4">📄</div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {selectedFile.name}
                              </h3>
                              <p className="text-gray-600 mb-2">
                                File Type: {selectedFile.type}
                              </p>
                              <p className="text-gray-600">
                                Size: {(selectedFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Printing Options */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Printing Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Size
                    </label>
                    <select
                      value={printingOptions.pageSize}
                      onChange={(e) => setPrintingOptions(prev => ({ ...prev, pageSize: e.target.value as 'A4' | 'A3' }))}
                      className="form-select"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <select
                      value={printingOptions.color}
                      onChange={(e) => {
                        const newColor = e.target.value as 'color' | 'bw' | 'mixed';
                        setPrintingOptions(prev => ({ 
                          ...prev, 
                          color: newColor,
                          pageColors: newColor === 'mixed' ? (prev.pageColors || { colorPages: [], bwPages: [] }) : undefined
                        }));
                        
                        // Reset input when switching to mixed
                        if (newColor === 'mixed') {
                          setColorPagesInput('');
                        }
                      }}
                      className="form-select"
                    >
                      <option value="bw">Black & White</option>
                      <option value="color">Color</option>
                      <option value="mixed">Mixed (Select Pages)</option>
                    </select>
                  </div>

                  {/* Page Color Selection - Only show when Mixed is selected */}
                  {printingOptions.color === 'mixed' && pageCount > 1 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Page Colors
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-2">
                            Color Pages
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., 1,3,5-8,10"
                            value={colorPagesInput}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              setColorPagesInput(inputValue);
                              
                              // Parse and update page colors
                              const pages = parsePageRange(inputValue, pageCount);
                              setPrintingOptions(prev => ({
                                ...prev,
                                pageColors: {
                                  colorPages: pages,
                                  bwPages: generateBwPages(pageCount, pages)
                                }
                              }));
                            }}
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Enter page numbers or ranges (e.g., 1,3,5-8,10)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Black & White Pages
                          </label>
                          <input
                            type="text"
                            placeholder="Auto-generated"
                            value={printingOptions.pageColors?.bwPages.join(',') || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Automatically calculated from remaining pages
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-blue-700">
                        <strong>Preview:</strong> {getPageColorPreview(pageCount, printingOptions.pageColors)}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sided
                    </label>
                    <select
                      value={printingOptions.sided}
                      onChange={(e) => setPrintingOptions(prev => ({ ...prev, sided: e.target.value as 'single' | 'double' }))}
                      className="form-select"
                    >
                      <option value="single">Single-sided</option>
                      <option value="double">Double-sided</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Copies
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={printingOptions.copies || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          // Allow empty value temporarily
                          setPrintingOptions(prev => ({ ...prev, copies: 0 }));
                        } else {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue) && numValue >= 1) {
                            setPrintingOptions(prev => ({ ...prev, copies: numValue }));
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 1) {
                          setPrintingOptions(prev => ({ ...prev, copies: 1 }));
                        }
                      }}
                      className="form-select"
                    />
                  </div>
                </div>

                {/* Service Option (only if multi-page) */}
                {pageCount > 1 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Service Option (one is required)
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center cursor-pointer p-3 rounded border transition-colors hover:bg-white">
                        <input
                          type="radio"
                          name="serviceOption"
                          checked={printingOptions.serviceOption === 'binding'}
                          onChange={() => setPrintingOptions(prev => ({ ...prev, serviceOption: 'binding' }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          📎 Binding (+₹{pricingData?.additionalServices?.binding || 20})
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer p-3 rounded border transition-colors hover:bg-white">
                        <input
                          type="radio"
                          name="serviceOption"
                          checked={printingOptions.serviceOption === 'file'}
                          onChange={() => setPrintingOptions(prev => ({ ...prev, serviceOption: 'file' }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          🗂️ Plastic file (₹10)
                        </span>
                      </label>

                      <label className="flex items-center cursor-pointer p-3 rounded border transition-colors hover:bg-white">
                        <input
                          type="radio"
                          name="serviceOption"
                          checked={printingOptions.serviceOption === 'service'}
                          onChange={() => setPrintingOptions(prev => ({ ...prev, serviceOption: 'service' }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          ✅ Minimal service fee (₹5)
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Choose one: Binding, Plastic file to keep pages inside file, or minimal service fee.
                    </p>
                  </div>
                </div>
                )}

                {/* Expected Delivery Date */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // Tomorrow
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Please select a date at least 1 day from today
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">File:</span>
                    <span className="font-medium text-gray-800 text-right max-w-xs truncate">
                      {selectedFile ? selectedFile.name : 'No file selected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium text-gray-800">{pageCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium text-gray-800">{printingOptions.pageSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium text-gray-800">
                      {printingOptions.color === 'color' ? 'Color' : 
                       printingOptions.color === 'bw' ? 'Black & White' : 
                       'Mixed'}
                    </span>
                  </div>
                  {printingOptions.color === 'mixed' && printingOptions.pageColors && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Color Pages:</span>
                      <span className="font-medium text-green-600">
                        {printingOptions.pageColors.colorPages.length} pages
                      </span>
                    </div>
                  )}
                  {printingOptions.color === 'mixed' && printingOptions.pageColors && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">B&W Pages:</span>
                      <span className="font-medium text-gray-600">
                        {printingOptions.pageColors.bwPages.length} pages
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Sided:</span>
                    <span className="font-medium text-gray-800">
                      {printingOptions.sided === 'double' ? 'Double-sided' : 'Single-sided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Copies:</span>
                    <span className="font-medium text-gray-800">{printingOptions.copies}</span>
                  </div>
                  {pageCount > 1 && printingOptions.serviceOption === 'binding' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Binding:</span>
                      <span className="font-medium text-blue-600">Yes (+₹{pricingData?.additionalServices?.binding || 20})</span>
                    </div>
                  )}
                  {pageCount > 1 && printingOptions.serviceOption === 'file' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Plastic file:</span>
                      <span className="font-medium text-gray-800">₹10</span>
                    </div>
                  )}
                  {pageCount > 1 && printingOptions.serviceOption === 'service' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Service fee:</span>
                      <span className="font-medium text-gray-800">₹5</span>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                      <span className="text-2xl font-bold text-gray-800">₹{amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Step Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedFile && orderType === 'file'}
                  className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Details →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Details & Payment</h2>
                <p className="text-gray-600">Fill in your details, choose delivery option, and complete payment</p>
              </div>

              {/* Back Button */}
              <div className="text-left">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back to Upload
                </button>
              </div>


              {/* Customer Information Form */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
                {isAuthenticated ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Signed in as <strong>{user?.name || user?.email}</strong>. Your information has been pre-filled.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Sign in required:</strong> You need to sign in to place an order. 
                      <a href="/auth/signin" className="text-blue-600 hover:text-blue-800 underline ml-1">Sign in here</a> or 
                      <a href="/auth/signup" className="text-blue-600 hover:text-blue-800 underline ml-1">create an account</a>.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="form-select"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="form-select"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Options */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Delivery Options</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="pickup"
                        checked={deliveryOption.type === 'pickup'}
                        onChange={() => setDeliveryOption({ type: 'pickup' })}
                        className="mr-2"
                      />
                      <span className="font-medium">🏫 Pickup from Campus (FREE)</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="delivery"
                        checked={deliveryOption.type === 'delivery'}
                        onChange={() => setDeliveryOption({ type: 'delivery' })}
                        className="mr-2"
                      />
                      <span className="font-medium">🚚 Home Delivery (₹10-50 extra)</span>
                    </label>
                  </div>

                  {deliveryOption.type === 'delivery' && (
                    <div className="ml-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-3">
                        Delivery charges are calculated based on distance from campus:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• 0-5 km: ₹10</li>
                        <li>• 5-10 km: ₹20</li>
                        <li>• 10-15 km: ₹30</li>
                        <li>• 15-20 km: ₹40</li>
                        <li>• 20+ km: ₹50</li>
                      </ul>
                      
                      {/* Delivery Address Form */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-800">📍 Delivery Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Complete Address *
                            </label>
                            <textarea
                              required
                              value={deliveryOption.address || ''}
                              onChange={(e) => setDeliveryOption(prev => ({ 
                                ...prev, 
                                address: e.target.value 
                              }))}
                              rows={3}
                              placeholder="Enter your complete delivery address"
                              className="form-select"
                            />
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                City *
                              </label>
                              <input
                                type="text"
                                required
                                value={deliveryOption.city || ''}
                                onChange={(e) => setDeliveryOption(prev => ({ 
                                  ...prev, 
                                  city: e.target.value 
                                }))}
                                placeholder="Enter your city"
                                className="form-select"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                PIN Code *
                              </label>
                              <input
                                type="text"
                                required
                                value={deliveryOption.pinCode || ''}
                                onChange={(e) => setDeliveryOption(prev => ({ 
                                  ...prev, 
                                  pinCode: e.target.value 
                                }))}
                                placeholder="Enter PIN code"
                                className="form-select"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {deliveryOption.type === 'pickup' && (
                    <div className="ml-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-3">🏫 Select Pickup Location</h4>
                      
                      {pickupLocations.length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-2">
                              Choose Pickup Location:
                            </label>
                            <select
                              value={selectedPickupLocation?._id || ''}
                              onChange={(e) => {
                                const location = pickupLocations.find(loc => loc._id === e.target.value);
                                setSelectedPickupLocation(location || null);
                                setDeliveryOption(prev => ({
                                  ...prev,
                                  pickupLocationId: location?._id
                                }));
                              }}
                              className="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="">Select a pickup location</option>
                              {pickupLocations.map((location) => (
                                <option key={location._id} value={location._id}>
                                  {location.name} {location.isDefault ? '(Default)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {selectedPickupLocation && (
                            <div className="bg-white p-3 rounded border border-green-200">
                              <div className="text-sm text-green-700">
                                <p><strong>📍 {selectedPickupLocation.name}</strong></p>
                                <p className="text-gray-600">{selectedPickupLocation.address}</p>
                                {selectedPickupLocation.description && (
                                  <p className="text-gray-600 mt-1">{selectedPickupLocation.description}</p>
                                )}
                                {selectedPickupLocation.contactPerson && (
                                  <p><strong>Contact:</strong> {selectedPickupLocation.contactPerson}</p>
                                )}
                                {selectedPickupLocation.contactPhone && (
                                  <p><strong>Phone:</strong> {selectedPickupLocation.contactPhone}</p>
                                )}
                                {selectedPickupLocation.operatingHours && (
                                  <p><strong>Hours:</strong> {selectedPickupLocation.operatingHours}</p>
                                )}
                                {selectedPickupLocation.gmapLink && (
                                  <a 
                                    href={selectedPickupLocation.gmapLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                                  >
                                    📍 View on Google Maps
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-green-700">
                          <p>Loading pickup locations...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Order Summary */}
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Complete Order Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File & Printing Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-800 border-b pb-2">📄 Document Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">File:</span>
                          <span className="font-medium text-gray-800">
                            {selectedFile ? selectedFile.name : 'Template Order'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pages:</span>
                          <span className="font-medium text-gray-800">{pageCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium text-gray-800">{printingOptions.pageSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium text-gray-800">
                            {printingOptions.color === 'color' ? 'Color' : 
                             printingOptions.color === 'bw' ? 'Black & White' : 
                             'Mixed'}
                          </span>
                        </div>
                        {printingOptions.color === 'mixed' && printingOptions.pageColors && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color Pages:</span>
                              <span className="font-medium text-green-600">
                                {printingOptions.pageColors.colorPages.length} pages
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">B&W Pages:</span>
                              <span className="font-medium text-gray-600">
                                {printingOptions.pageColors.bwPages.length} pages
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sided:</span>
                          <span className="font-medium text-gray-800">
                            {printingOptions.sided === 'double' ? 'Double-sided' : 'Single-sided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Copies:</span>
                          <span className="font-medium text-gray-800">{printingOptions.copies}</span>
                        </div>
                        {printingOptions.serviceOption === 'binding' && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Binding:</span>
                            <span className="font-medium text-blue-600">Yes (+₹{pricingData?.additionalServices?.binding || 20})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student & Delivery Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-800 border-b pb-2">👤 Student & Delivery</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-800">{customerInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium text-gray-800">{customerInfo.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium text-gray-800">{customerInfo.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span className="font-medium text-gray-800">
                            {deliveryOption.type === 'pickup' ? '🏫 Campus Pickup' : '🚚 Home Delivery'}
                          </span>
                        </div>
                        {deliveryOption.type === 'pickup' && selectedPickupLocation && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pickup Location:</span>
                            <span className="font-medium text-gray-800 text-right max-w-xs">
                              {selectedPickupLocation.name}
                            </span>
                          </div>
                        )}
                        {deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery Charge:</span>
                            <span className="font-medium text-red-600">₹{deliveryOption.deliveryCharge}</span>
                          </div>
                        )}
                        {deliveryOption.type === 'delivery' && deliveryOption.address && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Delivery Address:</span>
                            <span className="font-medium text-gray-800 text-right max-w-xs">
                              {deliveryOption.address}, {deliveryOption.city} - {deliveryOption.pinCode}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-3">💰 Pricing Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Price ({printingOptions.pageSize}):</span>
                        <span className="font-medium text-gray-800">
                          ₹{pricingLoading ? '...' : (pricingData?.basePrices?.[printingOptions.pageSize] || (printingOptions.pageSize === 'A3' ? 10 : 5))}/page × {pageCount} pages
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color Multiplier:</span>
                        <span className="font-medium text-gray-800">
                          {printingOptions.color === 'color' ? `${pricingLoading ? '...' : (pricingData?.multipliers?.color || 2)}x (Color)` : 
                           printingOptions.color === 'bw' ? '1x (B/W)' : 
                           'Mixed (See breakdown)'}
                        </span>
                      </div>
                      {printingOptions.color === 'mixed' && printingOptions.pageColors && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Color Pages Cost:</span>
                            <span className="font-medium text-green-600">
                              {printingOptions.pageColors.colorPages.length} × ₹{pricingData?.basePrices?.[printingOptions.pageSize] || 5} × {pricingData?.multipliers?.color || 2} = ₹{printingOptions.pageColors.colorPages.length * (pricingData?.basePrices?.[printingOptions.pageSize] || 5) * (pricingData?.multipliers?.color || 2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">B&W Pages Cost:</span>
                            <span className="font-medium text-gray-600">
                              {printingOptions.pageColors.bwPages.length} × ₹{pricingData?.basePrices?.[printingOptions.pageSize] || 5} × 1 = ₹{printingOptions.pageColors.bwPages.length * (pricingData?.basePrices?.[printingOptions.pageSize] || 5)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sided Multiplier:</span>
                        <span className="font-medium text-gray-800">
                          {printingOptions.sided === 'double' ? `${pricingLoading ? '...' : (pricingData?.multipliers?.doubleSided || 1.5)}x` : '1x'} ({printingOptions.sided === 'double' ? 'Double' : 'Single'})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Copies:</span>
                        <span className="font-medium text-gray-800">{printingOptions.copies} copy(ies)</span>
                      </div>
                      {pageCount > 1 && printingOptions.serviceOption === 'binding' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Binding Service:</span>
                          <span className="font-medium text-blue-600">₹{pricingData?.additionalServices?.binding || 20}</span>
                        </div>
                      )}
                      {pageCount > 1 && printingOptions.serviceOption === 'file' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plastic file:</span>
                          <span className="font-medium text-gray-800">₹10</span>
                        </div>
                      )}
                      {pageCount > 1 && printingOptions.serviceOption === 'service' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service fee:</span>
                          <span className="font-medium text-gray-800">₹5</span>
                        </div>
                      )}
                      {deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Charge:</span>
                          <span className="font-medium text-red-600">₹{deliveryOption.deliveryCharge}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total Amount:</span>
                          <span className="text-gray-800">₹{amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Authentication Prompt */}
              {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">Sign In Required</h3>
                      <p className="text-blue-700 mb-4">
                        You need to sign in to place an order. Create an account or sign in to continue with your printing order.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href="/auth/signin"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Sign In
                      </a>
                      <a
                        href="/auth/signup"
                        className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                      >
                        Create Account
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Proceed to Payment Button */}
              <div className="text-center pt-6">
                <div className="space-y-4">
                  {isAuthenticated && (
                    <div className="form-message form-message-success">
                      <p className="font-medium">✅ Ready to Proceed!</p>
                      <p className="text-sm">You&apos;re signed in and ready to complete your order</p>
                    </div>
                  )}
                  <button
                    onClick={handlePayment}
                    disabled={isProcessingPayment || !isRazorpayLoaded || !isAuthenticated}
                    className="px-12 py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!isAuthenticated ? '🔒 Sign In to Place Order' :
                     !isRazorpayLoaded ? '⏳ Loading Payment Gateway...' : 
                     isProcessingPayment ? '🔄 Processing...' : 
                     `🚀 Proceed to Payment - ₹${amount.toFixed(2)}`}
                  </button>
                  {!isRazorpayLoaded && (
                    <p className="text-sm text-gray-500 mt-2">
                      Please wait while we load the payment gateway...
                    </p>
                  )}
                  {razorpayError && (
                    <p className="text-sm text-red-500 mt-2">
                      Payment gateway error: {razorpayError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

