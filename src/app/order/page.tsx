'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PrintingOptions {
  pageSize: 'A4' | 'A3';
  color: 'color' | 'bw';
  sided: 'single' | 'double';
  copies: number;
  serviceOption: 'binding' | 'file' | 'service';
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
}

export default function OrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  });
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [pageCount, setPageCount] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  
  // Step 2: Details, delivery, and payment
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
  });
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>({ type: 'pickup' });
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Email verification
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  
  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [pricingData, setPricingData] = useState<any>(null);
  
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
          setDefaultPickupLocation(data.defaultLocation);
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
      if (pageCount > 0) {
        try {
          // Fetch pricing from API
          const response = await fetch('/api/pricing');
          const data = await response.json();
          
          if (data.success) {
            const pricing = data.pricing;
            setPricingData(pricing); // Store pricing data for UI display
            
            // Base price per page
            const basePrice = pricing.basePrices[printingOptions.pageSize];
            
            // Color multiplier
            const colorMultiplier = printingOptions.color === 'color' ? pricing.multipliers.color : 1;
            
            // Sided multiplier
            const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
            
            // Calculate total amount: base price × page count × color × sided × copies
            let total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
            
            // Add compulsory service option cost (only for multi-page jobs)
            if (pageCount > 1) {
              if (printingOptions.serviceOption === 'binding') {
                total += pricing.additionalServices.binding;
              } else if (printingOptions.serviceOption === 'file') {
                total += 10; // File handling fee (keep pages inside file)
              } else if (printingOptions.serviceOption === 'service') {
                total += 5; // Minimal service fee
              }
            }
            
            // Add delivery charge if applicable
            if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
              total += deliveryOption.deliveryCharge;
            }
            
            setAmount(total);
          } else {
            // Fallback to hardcoded pricing if API fails
            const basePrice = printingOptions.pageSize === 'A3' ? 10 : 5;
            const colorMultiplier = printingOptions.color === 'color' ? 2 : 1;
            const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
            
            let total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
            
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
            
            setAmount(total);
          }
        } catch (error) {
          console.error('Error fetching pricing:', error);
          // Fallback to hardcoded pricing
          const basePrice = printingOptions.pageSize === 'A3' ? 10 : 5;
          const colorMultiplier = printingOptions.color === 'color' ? 2 : 1;
          const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
          
          let total = basePrice * pageCount * colorMultiplier * sidedMultiplier * printingOptions.copies;
          
          if (deliveryOption.type === 'delivery' && deliveryOption.deliveryCharge) {
            total += deliveryOption.deliveryCharge;
          }
          
          setAmount(total);
        }
      }
    };

    calculateAmount();
  }, [pageCount, printingOptions, deliveryOption]);

  // Email verification functions
  const handleSendOTP = async () => {
    if (!customerInfo.email) {
      alert('Please enter your email first');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: customerInfo.email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpSent(true);
        alert('OTP sent to your email! Please check your inbox.');
      } else {
        alert(`Failed to send OTP: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert('Please enter the OTP');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: customerInfo.email, 
          otp: otp 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEmailVerified(true);
        alert('Email verified successfully!');
      } else {
        alert(`OTP verification failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Payment function
  const handlePayment = async () => {
    if (!emailVerified) {
      alert('Please verify your email first');
      return;
    }

    setIsProcessingPayment(true);
          try {
        let data;
        
        // Create order and get Razorpay order details
        if (selectedFile && orderType === 'file') {
          // For file orders, use FormData to upload file and create order in one request
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('orderType', 'file');
          formData.append('customerInfo', JSON.stringify(customerInfo));
          formData.append('printingOptions', JSON.stringify({
            ...printingOptions,
            pageCount,
          }));
          formData.append('deliveryOption', JSON.stringify(deliveryOption));
          formData.append('expectedDate', expectedDate);

          // Debug: Log what we're sending
          console.log('🔍 DEBUG - Sending FormData:');
          console.log('  - customerInfo:', customerInfo);
          console.log('  - printingOptions:', { ...printingOptions, pageCount });
          console.log('  - deliveryOption:', deliveryOption);

          const response = await fetch('/api/orders/create', {
            method: 'POST',
            body: formData,
          });

          data = await response.json();
        } else {
          // For template orders, use JSON
          const orderData = {
            customerInfo,
            orderType: 'template',
            templateData: {
              templateType: 'custom',
              formData: {
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone,
              }
            },
            printingOptions: {
              ...printingOptions,
              pageCount,
            },
            deliveryOption,
            expectedDate,
          };

          const response = await fetch('/api/orders/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
          });

          data = await response.json();
        }

      if (data.success) {
        // Initialize Razorpay payment
        const options = {
          key: data.key,
          amount: data.amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          name: 'College Print Service',
          description: `Print Order #${data.orderId}`,
          order_id: data.razorpayOrderId,
          handler: async function (response: any) {
            try {
              // Verify payment on backend
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: data.orderId,
                }),
              });

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                alert('🎉 Payment successful! Your order has been placed.');
                // Redirect to my orders page
                window.location.href = '/my-orders';
              } else {
                alert('❌ Payment verification failed. Please contact support.');
              }
            } catch (error) {
              console.error('Error verifying payment:', error);
              alert('❌ Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: customerInfo.name,
            email: customerInfo.email,
            contact: customerInfo.phone,
          },
          theme: {
            color: '#000000',
          },
        };

        const razorpay = new (window as any).Razorpay(options);
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
      {/* Razorpay Script */}
      <script
        src="https://checkout.razorpay.com/v1/checkout.js"
        async
      />
      
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
                      onChange={(e) => setPrintingOptions(prev => ({ ...prev, color: e.target.value as 'color' | 'bw' }))}
                      className="form-select"
                    >
                      <option value="bw">Black & White</option>
                      <option value="color">Color</option>
                    </select>
                  </div>

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
                          🗂️ File handling (₹10)
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
                      Choose one: Binding, File handling to keep pages inside file, or minimal service fee.
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
                      {printingOptions.color === 'color' ? 'Color' : 'Black & White'}
                    </span>
                  </div>
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
                      <span className="text-gray-600">File handling:</span>
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

              {/* Email Verification Section */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📧 Email Verification Required</h3>
                <p className="text-gray-700 mb-4">
                  Please verify your email address to continue with your order. We&apos;ll send you a 6-digit OTP.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        required
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        className="form-input flex-1"
                      />
                      <button
                        onClick={handleSendOTP}
                        disabled={!customerInfo.email || isSendingOtp}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isSendingOtp ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                  
                  {/* OTP Input Section */}
                  {otpSent && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-600">📧</div>
                        <div>
                          <h4 className="font-medium text-gray-800">OTP Sent Successfully!</h4>
                          <p className="text-sm text-gray-700">
                            We&apos;ve sent a 6-digit OTP to {customerInfo.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          maxLength={6}
                          className="form-input flex-1"
                        />
                        <button
                          onClick={handleVerifyOTP}
                          disabled={!otp || isVerifying || emailVerified}
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isVerifying ? 'Verifying...' : emailVerified ? '✓ Verified' : 'Verify OTP'}
                        </button>
                      </div>
                      
                      {emailVerified && (
                        <div className="mt-2 text-sm text-gray-700 font-medium bg-gray-100 p-3 rounded-lg border border-gray-300">
                          ✅ Email verified successfully! You can now proceed with your order.
                        </div>
                      )}
                      
                      {/* Resend OTP Option */}
                      {otpSent && !emailVerified && (
                        <div className="mt-3 text-center">
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={isSendingOtp}
                            className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
                          >
                            {isSendingOtp ? 'Sending...' : "Didn't receive OTP? Resend"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information Form */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
                
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

                  {deliveryOption.type === 'pickup' && defaultPickupLocation && (
                    <div className="ml-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">🏫 Pickup Location</h4>
                      <div className="text-sm text-green-700">
                        <p className="font-medium">{defaultPickupLocation.name}</p>
                        <p>{defaultPickupLocation.address}</p>
                        {defaultPickupLocation.gmapLink && (
                          <a
                            href={defaultPickupLocation.gmapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                          >
                            View on Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Order Summary */}
              {emailVerified && (
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
                            {printingOptions.color === 'color' ? 'Color' : 'Black & White'}
                          </span>
                        </div>
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
                          ₹{(() => {
                            // This will be updated by the pricing API
                            return printingOptions.pageSize === 'A3' ? 10 : 5;
                          })()}/page × {pageCount} pages
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color Multiplier:</span>
                        <span className="font-medium text-gray-800">
                          {printingOptions.color === 'color' ? '2x' : '1x'} ({printingOptions.color === 'color' ? 'Color' : 'B/W'})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sided Multiplier:</span>
                        <span className="font-medium text-gray-800">
                          {printingOptions.sided === 'double' ? '1.5x' : '1x'} ({printingOptions.sided === 'double' ? 'Double' : 'Single'})
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
                          <span className="text-gray-600">File handling:</span>
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
              )}

              {/* Proceed to Payment Button */}
              <div className="text-center pt-6">
                {emailVerified ? (
                  <div className="space-y-4">
                    <div className="form-message form-message-success">
                      <p className="font-medium">✅ Email Verified Successfully!</p>
                      <p className="text-sm">You can now proceed with your order</p>
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessingPayment}
                      className="px-12 py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? '🔄 Processing...' : `🚀 Proceed to Payment - ₹${amount.toFixed(2)}`}
                    </button>
                  </div>
                ) : (
                  <div className="form-message form-message-info">
                    <p className="font-medium">⚠️ Email Verification Required</p>
                    <p className="text-sm">Please verify your email address above to continue with your order</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

