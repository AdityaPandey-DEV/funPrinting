'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/useRazorpay';
import { checkPendingPaymentVerification, handlePaymentSuccess, handlePaymentFailure } from '@/lib/paymentUtils';
import { useAuth } from '@/hooks/useAuth';

interface PrintingOptions {
  pageSize: 'A4' | 'A3';
  color: 'color' | 'bw' | 'mixed';
  sided: 'single' | 'double';
  copies: number;
  serviceOption?: 'binding' | 'file' | 'service'; // Legacy support
  serviceOptions?: ('binding' | 'file' | 'service')[]; // Per-file service options
  pageColors?: {
    colorPages: number[];
    bwPages: number[];
  } | Array<{ // Per-file page colors (new format)
    colorPages: number[];
    bwPages: number[];
  }>;
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
interface ParsePageRangeResult {
  pages: number[];
  errors: string[];
  warnings: string[];
}

const parsePageRange = (input: string, maxPages?: number): ParsePageRangeResult => {
  const result: ParsePageRangeResult = {
    pages: [],
    errors: [],
    warnings: []
  };

  if (!input || !input.trim()) {
    return result;
  }
  
  try {
    const pages: number[] = [];
    const parts = input.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue; // Skip empty parts
      
      if (trimmed.includes('-')) {
        // Handle range like "5-8" or "5-" (open-ended)
        const rangeParts = trimmed.split('-');
        if (rangeParts.length === 2) {
          const startStr = rangeParts[0].trim();
          const endStr = rangeParts[1].trim();
          
          if (!startStr) {
            result.errors.push(`Invalid range "${trimmed}": missing start page`);
            continue;
          }
          
          const start = parseInt(startStr);
          if (isNaN(start) || start <= 0) {
            result.errors.push(`Invalid range "${trimmed}": start page must be a positive number`);
            continue;
          }
          
          if (!endStr) {
            // Open-ended range like "5-" means from 5 to end
            if (maxPages) {
              if (start > maxPages) {
                result.errors.push(`Range "${trimmed}": start page ${start} exceeds total pages ${maxPages}`);
                continue;
              }
              for (let i = start; i <= maxPages; i++) {
                pages.push(i);
              }
            } else {
              result.warnings.push(`Range "${trimmed}": cannot determine end page without total page count`);
            }
          } else {
            const end = parseInt(endStr);
            if (isNaN(end)) {
              result.errors.push(`Invalid range "${trimmed}": end page must be a number`);
              continue;
            }
            
            if (start > end) {
              result.errors.push(`Invalid range "${trimmed}": start page (${start}) must be less than or equal to end page (${end})`);
              continue;
            }
            
            if (maxPages && end > maxPages) {
              result.warnings.push(`Range "${trimmed}": end page ${end} exceeds total pages ${maxPages}, using ${maxPages} instead`);
            }
            
            const actualEnd = maxPages ? Math.min(end, maxPages) : end;
            for (let i = start; i <= actualEnd; i++) {
              pages.push(i);
            }
          }
        } else {
          result.errors.push(`Invalid range format "${trimmed}": use format "start-end"`);
        }
      } else {
        // Handle single page
        const page = parseInt(trimmed);
        if (isNaN(page)) {
          result.errors.push(`Invalid page number "${trimmed}": must be a number`);
          continue;
        }
        
        if (page <= 0) {
          result.errors.push(`Invalid page number "${trimmed}": must be greater than 0`);
          continue;
        }
        
        if (maxPages && page > maxPages) {
          result.warnings.push(`Page ${page} exceeds total pages ${maxPages}`);
          continue;
        }
        
        pages.push(page);
      }
    }
    
    // Remove duplicates and sort
    result.pages = [...new Set(pages)].sort((a, b) => a - b);
    
    // Check for duplicates in input (before parsing)
    const inputParts = input.split(',').map(p => p.trim()).filter(p => p);
    const uniqueInputParts = [...new Set(inputParts)];
    if (inputParts.length !== uniqueInputParts.length) {
      result.warnings.push('Duplicate page numbers detected in input');
    }
    
  } catch (error) {
    console.error('Error parsing page range:', error);
    result.errors.push('An error occurred while parsing page range');
  }
  
  return result;
};

const generateBwPages = (totalPages: number, colorPages: number[]): number[] => {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return allPages.filter(page => !colorPages.includes(page));
};

/**
 * Truncate file name to maintain length of ~10 characters
 * Example: "adityapandey.pdf" -> "adi..ya.pdf"
 * Keeps first 3-4 chars, then "..", then last 2-3 chars before extension
 */
const truncateFileName = (fileName: string, maxLength: number = 10): string => {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  
  // Extract extension
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, just truncate with ellipsis
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const nameWithoutExt = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  
  // If name without extension is short enough, return as is
  if (nameWithoutExt.length + extension.length <= maxLength) {
    return fileName;
  }
  
  // Calculate how much space we have for the name (excluding extension and "..")
  const availableLength = maxLength - extension.length - 2; // 2 for ".."
  
  if (availableLength < 2) {
    // Very short, just show extension
    return '..' + extension;
  }
  
  // For better readability: first part gets slightly more (3-4 chars), last part gets 2-3 chars
  // This creates patterns like "adi..ya.pdf" (3+2=5) or "very..me.pdf" (4+2=6)
  const firstPartLength = Math.min(4, Math.ceil(availableLength * 0.6)); // Prefer 3-4 chars for first part
  const lastPartLength = Math.max(2, availableLength - firstPartLength); // At least 2 chars for last part
  
  const firstPart = nameWithoutExt.substring(0, firstPartLength);
  const lastPart = nameWithoutExt.substring(nameWithoutExt.length - lastPartLength);
  
  return firstPart + '..' + lastPart + extension;
};

/**
 * Get page colors for a specific file (handles both array and legacy single object formats)
 */
const getFilePageColors = (
  fileIndex: number,
  pageColors?: { colorPages: number[]; bwPages: number[] } | Array<{ colorPages: number[]; bwPages: number[] }>
): { colorPages: number[]; bwPages: number[] } => {
  if (!pageColors) {
    return { colorPages: [], bwPages: [] };
  }
  
  // Handle array format (per-file)
  if (Array.isArray(pageColors)) {
    if (fileIndex >= 0 && fileIndex < pageColors.length) {
      return pageColors[fileIndex];
    }
    return { colorPages: [], bwPages: [] };
  }
  
  // Handle legacy single object format (backward compatibility)
  // For legacy format, we'd need to distribute pages across files, but that's complex
  // For now, return empty for files beyond the first one
  if (fileIndex === 0) {
    return pageColors;
  }
  
  return { colorPages: [], bwPages: [] };
};

/**
 * Calculate cost for a single file
 */
const calculateFileCost = (
  filePageCount: number,
  fileColorPages: number,
  fileBwPages: number,
  basePrice: number,
  colorMultiplier: number,
  sidedMultiplier: number,
  copies: number,
  colorMode: 'color' | 'bw' | 'mixed'
): number => {
  if (colorMode === 'mixed') {
    // Mixed: calculate color and B&W pages separately
    const colorCost = fileColorPages * basePrice * colorMultiplier;
    const bwCost = fileBwPages * basePrice;
    return (colorCost + bwCost) * sidedMultiplier * copies;
  } else if (colorMode === 'color') {
    // All color: apply multiplier to all pages
    return filePageCount * basePrice * colorMultiplier * sidedMultiplier * copies;
  } else {
    // All B&W: no multiplier
    return filePageCount * basePrice * sidedMultiplier * copies;
  }
};

const getPageColorPreview = (totalPages: number, pageColors?: { colorPages: number[]; bwPages: number[] } | Array<{ colorPages: number[]; bwPages: number[] }>): string => {
  if (!pageColors) return 'All pages in Black & White';
  
  // Handle array format (per-file) - show summary
  if (Array.isArray(pageColors)) {
    const totalColor = pageColors.reduce((sum, pc) => sum + pc.colorPages.length, 0);
    const totalBw = pageColors.reduce((sum, pc) => sum + pc.bwPages.length, 0);
    if (totalColor === 0) return 'All pages in Black & White';
    if (totalBw === 0) return 'All pages in Color';
    return `${totalColor} pages in Color, ${totalBw} pages in Black & White`;
  }
  
  // Handle legacy single object format
  const colorCount = pageColors.colorPages.length;
  const bwCount = pageColors.bwPages.length;
  
  if (colorCount === 0) return 'All pages in Black & White';
  if (bwCount === 0) return 'All pages in Color';
  
  return `${colorCount} pages in Color, ${bwCount} pages in Black & White`;
};

// Helper function to count pages in a file
const countPagesInFile = async (file: File): Promise<number> => {
  if (file.type === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const blob = new Blob([file], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      const loadingTask = pdfjsLib.getDocument(blobUrl);
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      
      URL.revokeObjectURL(blobUrl);
      return pageCount;
    } catch (error) {
      console.error('Error reading PDF page count with PDF.js:', error);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        return pdfDoc.getPageCount();
      } catch (pdfLibError) {
        console.error('Error reading PDF page count with pdf-lib:', pdfLibError);
        return Math.max(1, Math.floor(file.size / 50000));
      }
    }
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             file.type === 'application/msword') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Buffer = buffer.toString('base64');
      
      const response = await fetch('/api/parse-docx-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docxBuffer: base64Buffer }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.totalPages) {
          return data.totalPages;
        }
      }
      return 1;
    } catch (error) {
      console.error('Error parsing Word document:', error);
      return 1;
    }
  } else {
    // For other file types (images, etc.), assume 1 page
    return 1;
  }
};

export default function OrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded: isRazorpayLoaded, error: razorpayError, openRazorpay } = useRazorpay();
  const { user, isAuthenticated } = useAuth();
  
  // Removed step management - single page now
  
  // Step 1: File upload and preview
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileURLs, setFileURLs] = useState<string[]>([]);
  const [orderType, setOrderType] = useState<'file' | 'template'>('file');
  const [printingOptions, setPrintingOptions] = useState<PrintingOptions>({
    pageSize: 'A4',
    color: 'bw',
    sided: 'single',
    copies: 1,
    serviceOption: 'service', // Legacy support
    serviceOptions: [], // Per-file service options
    pageColors: [], // Per-file page colors array
  });
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [pageCount, setPageCount] = useState(1);
  const [filePageCounts, setFilePageCounts] = useState<number[]>([]); // Track page count for each file
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [isCountingPages, setIsCountingPages] = useState(false);
  
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
  const [colorPagesInput, setColorPagesInput] = useState<string>(''); // Legacy - will be replaced with per-file
  const [colorPagesInputs, setColorPagesInputs] = useState<string[]>([]); // Per-file color pages input
  const [colorPagesValidation, setColorPagesValidation] = useState<{ errors: string[]; warnings: string[] }>({ errors: [], warnings: [] });
  const [colorPagesValidations, setColorPagesValidations] = useState<Array<{ errors: string[]; warnings: string[] }>>([]); // Per-file validations

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

  // Load user profile and apply default location
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isAuthenticated && user?.email) {
        try {
          const response = await fetch('/api/user/profile');
          const data = await response.json();
          
          if (data.success && data.profile) {
            // Set phone number if available
            if (data.profile.phone) {
              setCustomerInfo(prev => ({
                ...prev,
                phone: data.profile.phone
              }));
            }
            
            // Apply default location if available
            if (data.profile.defaultLocation) {
              const defaultLoc = data.profile.defaultLocation;
              setSelectedPickupLocation(defaultLoc);
              setDeliveryOption(prev => ({
                ...prev,
                type: 'pickup',
                pickupLocationId: defaultLoc._id
              }));
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };

    loadUserProfile();
  }, [isAuthenticated, user]);

  // Save phone number to user profile when entered
  useEffect(() => {
    const savePhoneNumber = async () => {
      if (isAuthenticated && customerInfo.phone && customerInfo.phone.length >= 10) {
        try {
          const response = await fetch('/api/user/update-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: customerInfo.phone }),
          });
          
          const data = await response.json();
          if (data.success) {
            console.log('✅ Phone number saved to profile');
          }
        } catch (error) {
          console.error('Error saving phone number:', error);
        }
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      savePhoneNumber();
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [customerInfo.phone, isAuthenticated]);

  // Ensure serviceOptions array matches selectedFiles length
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const currentServiceOptions = printingOptions.serviceOptions || [];
      if (currentServiceOptions.length < selectedFiles.length) {
        const updatedOptions = [...currentServiceOptions];
        while (updatedOptions.length < selectedFiles.length) {
          updatedOptions.push('service');
        }
        setPrintingOptions(prev => ({ ...prev, serviceOptions: updatedOptions }));
        console.log(`📋 Synchronized serviceOptions: ${updatedOptions.length} options for ${selectedFiles.length} files`);
      }
    } else if (selectedFiles.length === 0 && printingOptions.serviceOptions && printingOptions.serviceOptions.length > 0) {
      // Clear service options when no files are selected
      setPrintingOptions(prev => ({ ...prev, serviceOptions: [] }));
    }
  }, [selectedFiles.length]);

  // Check for pending payment verification on page load (iPhone Safari recovery)
  useEffect(() => {
    checkPendingPaymentVerification().then((result) => {
      if (result && result.success) {
        console.log('🔄 Payment verification recovered, redirecting to my orders...');
        router.push('/my-orders');
      }
    });
  }, [router]);
  
  
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
        if (orderData.pdfUrl) {
          setPdfUrls([orderData.pdfUrl]);
        setPdfLoaded(true);
        }
        
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
            
            // Calculate pricing per file
            let total = 0;
            const minServiceFeePageLimit = pricing.additionalServices.minServiceFeePageLimit || 1;
            const colorMultiplier = pricing.multipliers.color;
            const sidedMultiplier = printingOptions.sided === 'double' ? pricing.multipliers.doubleSided : 1;
            
            // Calculate cost for each file
            for (let i = 0; i < selectedFiles.length; i++) {
              const filePageCount = filePageCounts[i] || 1;
              
              // Get page colors for this file
              const filePageColors = getFilePageColors(i, printingOptions.pageColors);
              const fileColorPages = filePageColors.colorPages.length;
              const fileBwPages = filePageColors.bwPages.length;
              
              // Calculate base cost for this file using helper function
              const fileBaseCost = calculateFileCost(
                filePageCount,
                fileColorPages,
                fileBwPages,
                basePrice,
                colorMultiplier,
                sidedMultiplier,
                printingOptions.copies,
                printingOptions.color
              );
              total += fileBaseCost;
              
              // Add service option cost for this file if it exceeds limit
              if (filePageCount > minServiceFeePageLimit) {
                const fileServiceOption = printingOptions.serviceOptions?.[i] || printingOptions.serviceOption || 'service';
                if (fileServiceOption === 'binding') {
                total += pricing.additionalServices.binding;
                } else if (fileServiceOption === 'file') {
                  total += 10; // Plastic file fee
                } else if (fileServiceOption === 'service') {
                  total += pricing.additionalServices.minServiceFee;
                }
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
              serviceOptions: printingOptions.serviceOptions,
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
            
            // Calculate pricing per file (fallback)
            let total = 0;
            const colorMultiplier = 2; // Default fallback color multiplier
            const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
            
            // Calculate cost for each file
            for (let i = 0; i < selectedFiles.length; i++) {
              const filePageCount = filePageCounts[i] || 1;
              
              // Get page colors for this file
              const filePageColors = getFilePageColors(i, printingOptions.pageColors);
              const fileColorPages = filePageColors.colorPages.length;
              const fileBwPages = filePageColors.bwPages.length;
              
              // Calculate base cost for this file using helper function
              const fileBaseCost = calculateFileCost(
                filePageCount,
                fileColorPages,
                fileBwPages,
                basePrice,
                colorMultiplier,
                sidedMultiplier,
                printingOptions.copies,
                printingOptions.color
              );
              total += fileBaseCost;
              
              // Add service option cost for this file if it exceeds limit
              if (filePageCount > 1) {
                const fileServiceOption = printingOptions.serviceOptions?.[i] || printingOptions.serviceOption || 'service';
                if (fileServiceOption === 'binding') {
                total += 20; // Default binding cost
                } else if (fileServiceOption === 'file') {
                total += 10;
                } else if (fileServiceOption === 'service') {
                  total += 5; // Default minimal service fee
                }
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
              serviceOptions: printingOptions.serviceOptions,
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
          
          // Calculate pricing per file (error fallback)
          let total = 0;
          const colorMultiplier = 2; // Default fallback color multiplier
          const sidedMultiplier = printingOptions.sided === 'double' ? 1.5 : 1;
          
          // Calculate cost for each file
          for (let i = 0; i < selectedFiles.length; i++) {
            const filePageCount = filePageCounts[i] || 1;
            
            // Get page colors for this file
            const filePageColors = getFilePageColors(i, printingOptions.pageColors);
            const fileColorPages = filePageColors.colorPages.length;
            const fileBwPages = filePageColors.bwPages.length;
            
            // Calculate base cost for this file using helper function
            const fileBaseCost = calculateFileCost(
              filePageCount,
              fileColorPages,
              fileBwPages,
              basePrice,
              colorMultiplier,
              sidedMultiplier,
              printingOptions.copies,
              printingOptions.color
            );
            total += fileBaseCost;
            
            // Add service option cost for this file if it exceeds limit
            if (filePageCount > 1) {
              const fileServiceOption = printingOptions.serviceOptions?.[i] || printingOptions.serviceOption || 'service';
              if (fileServiceOption === 'binding') {
                total += 20; // Default binding cost
              } else if (fileServiceOption === 'file') {
                total += 10;
              } else if (fileServiceOption === 'service') {
                total += 5; // Default minimal service fee
              }
            }
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
            serviceOptions: printingOptions.serviceOptions,
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
  }, [pageCount, printingOptions, deliveryOption, selectedFiles, filePageCounts]);


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

    // Validate service options for each file exceeding minimum service fee page limit
    const minServiceFeePageLimit = pricingData?.additionalServices?.minServiceFeePageLimit || 1;
    for (let i = 0; i < selectedFiles.length; i++) {
      const filePageCount = filePageCounts[i] || 1;
      if (filePageCount > minServiceFeePageLimit) {
        const fileServiceOption = printingOptions.serviceOptions?.[i];
        if (!fileServiceOption) {
          alert(`Please select a service option for File ${i + 1} (${selectedFiles[i].name}) which has more than ${minServiceFeePageLimit} page(s)`);
      return;
        }
      }
    }

    // Validate mixed color page selection (per-file)
    if (printingOptions.color === 'mixed') {
      if (!printingOptions.pageColors) {
        alert('Please select which pages should be printed in color for each file');
        return;
      }
      
      // Validate per-file page colors
      const pageColorsArray = Array.isArray(printingOptions.pageColors) ? printingOptions.pageColors : (printingOptions.pageColors ? [printingOptions.pageColors] : []);
      for (let i = 0; i < selectedFiles.length; i++) {
        const filePageCount = filePageCounts[i] || 1;
        const filePageColors = pageColorsArray[i] || { colorPages: [], bwPages: [] };
        const totalSpecifiedPages = filePageColors.colorPages.length + filePageColors.bwPages.length;
        
        if (filePageCount > 1 && totalSpecifiedPages === 0) {
          alert(`Please select which pages should be printed in color for File ${i + 1}`);
        return;
      }
      
        // Check for duplicate pages in this file
        const allPages = [...filePageColors.colorPages, ...filePageColors.bwPages];
      const uniquePages = [...new Set(allPages)];
      if (allPages.length !== uniquePages.length) {
          alert(`Pages cannot be specified as both color and B&W for File ${i + 1}. Please check your selection.`);
        return;
        }
      }
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
      
      // First, upload files if it's a file order
      const fileURLs: string[] = [];
      const originalFileNames: string[] = [];
      if (selectedFiles.length > 0 && orderType === 'file') {
        try {
          // Upload all files
          for (const file of selectedFiles) {
          const uploadFormData = new FormData();
            uploadFormData.append('file', file);
          
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
              fileURLs.push(uploadData.fileURL);
              originalFileNames.push(uploadData.originalFileName);
              console.log(`✅ File uploaded successfully: ${uploadData.fileURL}`);
          } else {
            throw new Error(uploadData.error || 'Upload failed');
            }
          }
        } catch (error) {
          console.error('Error uploading files:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload files. Please try again.';
          alert(`Upload Error: ${errorMessage}`);
          setIsProcessingPayment(false);
          return;
        }
      }

      // Prepare order data for payment initiation
      const orderData = {
        customerInfo,
        orderType,
        fileURLs: orderType === 'file' && fileURLs.length > 0 ? fileURLs : undefined,
        fileURL: orderType === 'file' && fileURLs.length > 0 ? fileURLs[0] : undefined, // Legacy support
        originalFileNames: orderType === 'file' && originalFileNames.length > 0 ? originalFileNames : undefined,
        originalFileName: orderType === 'file' && originalFileNames.length > 0 ? originalFileNames[0] : undefined, // Legacy support
        filePageCounts: orderType === 'file' && filePageCounts.length > 0 ? filePageCounts : undefined, // Per-file page counts
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
          serviceOptions: printingOptions.serviceOptions, // Include per-file service options
          serviceOption: printingOptions.serviceOption, // Legacy support
          pageColors: printingOptions.pageColors, // Include per-file page colors
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
              
              // Use the new payment success handler with iPhone Safari recovery
              const result = await handlePaymentSuccess(response, data.orderId);
              
              if (result.success) {
                console.log('✅ Payment verified successfully:', result.data);
                alert(`🎉 Payment successful! Your order #${result.data.order.orderId} has been placed.`);
                // Redirect to my orders page
                window.location.href = '/my-orders';
              } else {
                console.error('❌ Payment verification failed:', result.error);
                alert(`❌ Payment verification failed: ${result.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('❌ Error in payment handler:', error);
              const failureResult = handlePaymentFailure(error, data.orderId);
              alert(`❌ Payment failed: ${failureResult.error}`);
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

        {/* Welcome Header with Trust Badges */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">✓ Secure Payment</span>
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">🚀 Fast Delivery</span>
            <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">⭐ 1000+ Happy Customers</span>
          </div>
        </div>

        {/* Single Page Layout - Grid with Left (Content) and Right (Sticky Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
            {/* File Upload & Options Section */}
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">📄 Upload Your Files</h2>
                <p className="text-gray-600">Upload your documents and configure printing options</p>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload Files</h3>
                  <div className="form-file-upload">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.svg"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setIsCountingPages(true);
                          setPdfLoaded(false);
                          
                          // Add new files to the existing list
                          setSelectedFiles(prev => [...prev, ...files]);
                          
                          // Create preview URLs for all files
                          const newUrls = files.map(file => URL.createObjectURL(file));
                          setPdfUrls(prev => [...prev, ...newUrls]);
                          
                          // Count pages for each new file
                          const newPageCounts: number[] = [];
                          for (const file of files) {
                            const pageCount = await countPagesInFile(file);
                            newPageCounts.push(pageCount);
                          }
                          
                          // Update page counts
                          setFilePageCounts(prev => [...prev, ...newPageCounts]);
                          
                          // Initialize service options for new files (default to 'service')
                          setPrintingOptions(prev => {
                            const currentServiceOptions = prev.serviceOptions || [];
                            const newServiceOptions = [...currentServiceOptions, ...files.map(() => 'service' as const)];
                            console.log(`📋 Initializing service options: ${currentServiceOptions.length} existing + ${files.length} new = ${newServiceOptions.length} total`);
                            
                            // Initialize per-file pageColors array if mixed color is selected
                            let updatedPageColors = prev.pageColors;
                            if (prev.color === 'mixed') {
                              const currentPageColors = Array.isArray(prev.pageColors) ? prev.pageColors : (prev.pageColors ? [prev.pageColors] : []);
                              const newPageColors = [...currentPageColors, ...files.map(() => ({ colorPages: [] as number[], bwPages: [] as number[] }))];
                              updatedPageColors = newPageColors;
                              console.log(`📋 Initializing per-file pageColors: ${currentPageColors.length} existing + ${files.length} new = ${newPageColors.length} total`);
                            }
                            
                            return {
                              ...prev,
                              serviceOptions: newServiceOptions,
                              pageColors: updatedPageColors
                            };
                          });
                          
                          // Calculate total page count
                          const totalPages = [...filePageCounts, ...newPageCounts].reduce((sum, count) => sum + count, 0);
                          setPageCount(totalPages);
                          
                                setIsCountingPages(false);
                          setPdfLoaded(true);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Choose Files
                    </button>
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Selected Files ({selectedFiles.length}):
                        </p>
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600 truncate flex-1">{truncateFileName(file.name)}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {filePageCounts[index] || 1} page{filePageCounts[index] !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Preview with Service Options */}
              {pdfUrls.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h3>
                  <div className="space-y-6">
                    {selectedFiles.map((file, index) => {
                      const filePageCount = filePageCounts[index] || 1;
                      const minServiceFeePageLimit = pricingData?.additionalServices?.minServiceFeePageLimit ?? 1;
                      // Show service option if file has more pages than the limit (default to 1, so files with 2+ pages show options)
                      const needsServiceOption = filePageCount > minServiceFeePageLimit;
                      // Ensure serviceOptions array has an entry for this file index
                      const currentServiceOptions = printingOptions.serviceOptions || [];
                      // Initialize if needed (but don't setState during render - use useEffect)
                      const currentServiceOption = currentServiceOptions[index] || 'service';
                      
                      console.log(`📄 File ${index + 1}: ${filePageCount} pages, needsServiceOption: ${needsServiceOption}, currentOption: ${currentServiceOption}`);
                      
                      return (
                        <div key={index} className="space-y-4 mb-6">
                          {/* File Preview */}
                  <div className={`border rounded-lg overflow-hidden ${printingOptions.color === 'bw' ? 'grayscale' : ''}`}>
                            <div className="p-2 bg-gray-100 border-b">
                              <p className="text-sm font-medium text-gray-700">
                                File {index + 1}: {truncateFileName(file.name)} ({filePageCount} page{filePageCount !== 1 ? 's' : ''})
                              </p>
                        </div>
                            <div className="h-64">
                        {/* Image files - show directly */}
                              {file.type.startsWith('image/') && (
                                <img
                                  src={pdfUrls[index]}
                                  alt={`Preview ${file.name}`}
                                  className="w-full h-full object-contain"
                            onLoad={() => setPdfLoaded(true)}
                          />
                        )}
                        
                        {/* PDF files - use iframe */}
                              {file.type === 'application/pdf' && (
                          <iframe
                                  src={pdfUrls[index]}
                                  className="w-full h-full"
                            onLoad={() => setPdfLoaded(true)}
                                />
                              )}
                              
                              {/* Other files - show file info */}
                              {!file.type.startsWith('image/') && 
                               file.type !== 'application/pdf' && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                  <div className="text-center">
                                    <div className="text-4xl mb-2">📄</div>
                                    <p className="text-sm text-gray-600">
                                      {file.type}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                              </div>
                          </div>
                        )}
                            </div>
                          </div>
                          
                          {/* Service Option for this file - Always show for files with more than 1 page */}
                          {needsServiceOption ? (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <label className="block text-sm font-semibold text-gray-900 mb-3">
                                Service Option for File {index + 1} (required)
                              </label>
                              <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-blue-50 hover:border-blue-400 hover:shadow-md" style={{ borderColor: currentServiceOption === 'binding' ? '#3b82f6' : '#e5e7eb' }}>
                                    <input
                                      type="radio"
                                      name={`serviceOption-${index}`}
                                      checked={currentServiceOption === 'binding'}
                                      onChange={() => {
                                        setPrintingOptions(prev => {
                                          const currentOptions = prev.serviceOptions || [];
                                          const newServiceOptions = [...currentOptions];
                                          // Ensure array is long enough
                                          while (newServiceOptions.length <= index) {
                                            newServiceOptions.push('service');
                                          }
                                          newServiceOptions[index] = 'binding';
                                          console.log(`✅ File ${index + 1} service option set to: binding`);
                                          return { ...prev, serviceOptions: newServiceOptions };
                                        });
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700">
                                      📎 Binding (+₹{pricingData?.additionalServices?.binding || 40})
                                    </span>
                                  </label>

                                  <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-blue-50 hover:border-blue-400 hover:shadow-md" style={{ borderColor: currentServiceOption === 'file' ? '#3b82f6' : '#e5e7eb' }}>
                                    <input
                                      type="radio"
                                      name={`serviceOption-${index}`}
                                      checked={currentServiceOption === 'file'}
                                      onChange={() => {
                                        setPrintingOptions(prev => {
                                          const currentOptions = prev.serviceOptions || [];
                                          const newServiceOptions = [...currentOptions];
                                          // Ensure array is long enough
                                          while (newServiceOptions.length <= index) {
                                            newServiceOptions.push('service');
                                          }
                                          newServiceOptions[index] = 'file';
                                          console.log(`✅ File ${index + 1} service option set to: file`);
                                          return { ...prev, serviceOptions: newServiceOptions };
                                        });
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700">
                                      🗂️ Plastic file (₹10)
                                    </span>
                                  </label>

                                  <label className="flex items-center cursor-pointer p-3 rounded-lg border-2 transition-all hover:bg-blue-50 hover:border-blue-400 hover:shadow-md" style={{ borderColor: currentServiceOption === 'service' ? '#3b82f6' : '#e5e7eb' }}>
                                    <input
                                      type="radio"
                                      name={`serviceOption-${index}`}
                                      checked={currentServiceOption === 'service'}
                                      onChange={() => {
                                        setPrintingOptions(prev => {
                                          const currentOptions = prev.serviceOptions || [];
                                          const newServiceOptions = [...currentOptions];
                                          // Ensure array is long enough
                                          while (newServiceOptions.length <= index) {
                                            newServiceOptions.push('service');
                                          }
                                          newServiceOptions[index] = 'service';
                                          console.log(`✅ File ${index + 1} service option set to: service`);
                                          return { ...prev, serviceOptions: newServiceOptions };
                                        });
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700">
                                      ✅ Minimal service fee (₹{pricingData?.additionalServices?.minServiceFee || 5})
                                    </span>
                                  </label>
                                </div>
                                <p className="text-xs text-gray-600 mt-3 font-medium">
                                  💡 Choose one: Binding, Plastic file to keep pages inside file, or minimal service fee.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                              Service option not required for single-page files
                            </div>
                          )}

                          {/* Per-File Mixed Color Selection - Only show when Mixed is selected */}
                          {printingOptions.color === 'mixed' && filePageCount > 1 && (
                            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                              <label className="block text-sm font-semibold text-gray-900 mb-3">
                                Select Page Colors for File {index + 1} ({filePageCount} pages)
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-2">
                                    Color Pages (1-{filePageCount})
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={`e.g., 1-3 or 2,4 or 1-3,5 for pages 1-${filePageCount}`}
                                    value={colorPagesInputs[index] || ''}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      // Update per-file input
                                      const newInputs = [...colorPagesInputs];
                                      while (newInputs.length <= index) {
                                        newInputs.push('');
                                      }
                                      newInputs[index] = inputValue;
                                      setColorPagesInputs(newInputs);
                                      
                                      // Parse and update page colors with validation (per-file)
                                      const parseResult = parsePageRange(inputValue, filePageCount);
                                      const newValidations = [...colorPagesValidations];
                                      while (newValidations.length <= index) {
                                        newValidations.push({ errors: [], warnings: [] });
                                      }
                                      newValidations[index] = {
                                        errors: parseResult.errors,
                                        warnings: parseResult.warnings
                                      };
                                      setColorPagesValidations(newValidations);
                                      
                                      // Update per-file pageColors in array
                                      setPrintingOptions(prev => {
                                        const currentPageColors = Array.isArray(prev.pageColors) ? prev.pageColors : [];
                                        const newPageColors = [...currentPageColors];
                                        while (newPageColors.length <= index) {
                                          newPageColors.push({ colorPages: [], bwPages: [] });
                                        }
                                        newPageColors[index] = {
                                          colorPages: parseResult.pages,
                                          bwPages: generateBwPages(filePageCount, parseResult.pages)
                                        };
                                        return {
                                          ...prev,
                                          pageColors: newPageColors
                                        };
                                      });
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                      (colorPagesValidations[index]?.errors?.length || 0) > 0
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                    }`}
                                  />
                                  
                                  {/* Validation Messages */}
                                  {colorPagesValidations[index]?.errors && colorPagesValidations[index].errors.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {colorPagesValidations[index].errors.map((error, idx) => (
                                        <p key={idx} className="text-xs text-red-600">
                                          ⚠️ {error}
                                        </p>
                                      ))}
                            </div>
                                  )}
                                  
                                  {colorPagesValidations[index]?.warnings && colorPagesValidations[index].warnings.length > 0 && colorPagesValidations[index].errors.length === 0 && (
                                    <div className="mt-2 space-y-1">
                                      {colorPagesValidations[index].warnings.map((warning, idx) => (
                                        <p key={idx} className="text-xs text-yellow-600">
                                          ℹ️ {warning}
                                        </p>
                                      ))}
                          </div>
                        )}
                                  
                                  {/* Helper Text */}
                                  <p className="text-xs text-green-600 mt-2">
                                    <strong>Examples:</strong> 1-3 (pages 1 to 3), 2,4 (pages 2 and 4), 1-3,5 (pages 1-3 and 5)
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Black & White Pages
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Auto-generated"
                                    value={(() => {
                                      const filePageColors = getFilePageColors(index, printingOptions.pageColors);
                                      return filePageColors.bwPages.join(',') || '';
                                    })()}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Automatically calculated from remaining pages
                                  </p>
                                </div>
                              </div>
                              
                              {/* Visual Page Preview for this file */}
                              {filePageCount > 0 && (
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Preview for File {index + 1} ({filePageCount} pages)
                                  </label>
                                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                                    {Array.from({ length: filePageCount }, (_, i) => i + 1).map((pageNum) => {
                                      const filePageColors = getFilePageColors(index, printingOptions.pageColors);
                                      const isColor = filePageColors.colorPages.includes(pageNum);
                                      const isBw = filePageColors.bwPages.includes(pageNum);
                                      return (
                                        <div
                                          key={pageNum}
                                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                            isColor
                                              ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-sm'
                                              : isBw
                                              ? 'bg-gray-300 text-gray-800'
                                              : 'bg-gray-100 text-gray-500 border border-gray-300'
                                          }`}
                                          title={isColor ? `Page ${pageNum} - Color` : isBw ? `Page ${pageNum} - Black & White` : `Page ${pageNum} - Not specified`}
                                        >
                                          {pageNum}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {(() => {
                                    const filePageColors = getFilePageColors(index, printingOptions.pageColors);
                                    const totalSpecified = filePageColors.colorPages.length + filePageColors.bwPages.length;
                                    if (totalSpecified < filePageCount) {
                                      return (
                                        <p className="text-xs text-yellow-600 mt-2">
                                          ⚠️ Not all pages are specified. Unspecified pages will be printed in Black & White.
                                        </p>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                              
                              {/* Summary for this file */}
                              <div className="mt-3 p-2 bg-white rounded border border-purple-200">
                                <div className="text-sm text-purple-700">
                                  <strong>Summary for File {index + 1}:</strong> {(() => {
                                    const filePageColors = getFilePageColors(index, printingOptions.pageColors);
                                    const colorCount = filePageColors.colorPages.length;
                                    const bwCount = filePageColors.bwPages.length;
                                    if (colorCount === 0) return 'All pages in Black & White';
                                    if (bwCount === 0) return 'All pages in Color';
                                    return `${colorCount} pages in Color, ${bwCount} pages in Black & White`;
                                  })()}
                                </div>
                                {(() => {
                                  const filePageColors = getFilePageColors(index, printingOptions.pageColors);
                                  const totalSpecified = filePageColors.colorPages.length + filePageColors.bwPages.length;
                                  return (
                                    <div className="text-xs text-gray-600 mt-1">
                                      Color: {filePageColors.colorPages.length} pages | 
                                      B&W: {filePageColors.bwPages.length} pages | 
                                      Unspecified: {filePageCount - totalSpecified} pages
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    <div className="grid grid-cols-3 gap-3">
                      {/* Colorful Button */}
                      <button
                        type="button"
                        onClick={() => {
                        setPrintingOptions(prev => ({ 
                          ...prev, 
                            color: 'color',
                            pageColors: undefined
                          }));
                        }}
                        className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                          printingOptions.color === 'color'
                            ? 'ring-4 ring-blue-500 ring-offset-2 shadow-lg'
                            : 'hover:shadow-md'
                        }`}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                          color: 'white'
                        }}
                      >
                        Colorful
                      </button>
                      
                      {/* Black/White Split Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintingOptions(prev => ({ 
                            ...prev, 
                            color: 'bw',
                            pageColors: undefined
                          }));
                        }}
                        className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                          printingOptions.color === 'bw'
                            ? 'ring-4 ring-gray-500 ring-offset-2 shadow-lg'
                            : 'hover:shadow-md'
                        }`}
                        style={{
                          background: 'linear-gradient(to right, #000000 0%, #000000 50%, #ffffff 50%, #ffffff 100%)',
                          color: printingOptions.color === 'bw' ? 'white' : 'black',
                          border: '2px solid #333'
                        }}
                      >
                        B&W
                      </button>
                      
                      {/* Mixed Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintingOptions(prev => {
                            // Initialize per-file pageColors array if not already an array
                            let updatedPageColors = prev.pageColors;
                            if (!Array.isArray(updatedPageColors)) {
                              // Convert legacy format to array or initialize new array
                              if (selectedFiles.length > 0) {
                                updatedPageColors = selectedFiles.map(() => ({ colorPages: [] as number[], bwPages: [] as number[] }));
                              } else {
                                updatedPageColors = [];
                              }
                            } else if (updatedPageColors.length < selectedFiles.length) {
                              // Ensure array matches file count
                              const newPageColors = [...updatedPageColors];
                              while (newPageColors.length < selectedFiles.length) {
                                newPageColors.push({ colorPages: [], bwPages: [] });
                              }
                              updatedPageColors = newPageColors;
                            }
                            return { 
                              ...prev, 
                              color: 'mixed',
                              pageColors: updatedPageColors
                            };
                          });
                          setColorPagesInput('');
                          setColorPagesValidation({ errors: [], warnings: [] });
                        }}
                        className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                          printingOptions.color === 'mixed'
                            ? 'ring-4 ring-purple-500 ring-offset-2 shadow-lg'
                            : 'hover:shadow-md'
                        }`}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #667eea 33%, #000000 33%, #000000 66%, #ffffff 66%, #ffffff 100%)',
                          color: 'white',
                          border: '2px solid #333'
                        }}
                      >
                        Mixed
                      </button>
                    </div>
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
                            placeholder="e.g., 1-4 or 3,5 or 1-4,7,9"
                            value={colorPagesInput}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              setColorPagesInput(inputValue);
                              
                              // Parse and update page colors with validation
                              const parseResult = parsePageRange(inputValue, pageCount);
                              setColorPagesValidation({
                                errors: parseResult.errors,
                                warnings: parseResult.warnings
                              });
                              
                              setPrintingOptions(prev => ({
                                ...prev,
                                pageColors: {
                                  colorPages: parseResult.pages,
                                  bwPages: generateBwPages(pageCount, parseResult.pages)
                                }
                              }));
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                              colorPagesValidation.errors.length > 0
                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-green-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                          />
                          
                          {/* Validation Messages */}
                          {colorPagesValidation.errors.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {colorPagesValidation.errors.map((error, idx) => (
                                <p key={idx} className="text-xs text-red-600">
                                  ⚠️ {error}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {colorPagesValidation.warnings.length > 0 && colorPagesValidation.errors.length === 0 && (
                            <div className="mt-2 space-y-1">
                              {colorPagesValidation.warnings.map((warning, idx) => (
                                <p key={idx} className="text-xs text-yellow-600">
                                  ℹ️ {warning}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* Helper Text */}
                          <p className="text-xs text-green-600 mt-2">
                            <strong>Examples:</strong> 1-4 (pages 1 to 4), 3,5 (pages 3 and 5), 1-4,7 (pages 1-4 and 7)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Black & White Pages
                          </label>
                          <input
                            type="text"
                            placeholder="Auto-generated"
                            value={(() => {
                              if (!printingOptions.pageColors) return '';
                              if (Array.isArray(printingOptions.pageColors)) {
                                // For array format, show summary (legacy UI - should be removed)
                                const totalBw = printingOptions.pageColors.reduce((sum, pc) => sum + pc.bwPages.length, 0);
                                return totalBw > 0 ? `${totalBw} pages total` : '';
                              }
                              return printingOptions.pageColors.bwPages.join(',') || '';
                            })()}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Automatically calculated from remaining pages
                          </p>
                        </div>
                      </div>
                      
                      {/* Visual Page Preview */}
                      {pageCount > 0 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Page Preview ({pageCount} total pages)
                          </label>
                          <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
                              // Legacy: handle both array and single object format
                              let isColor = false;
                              let isBw = false;
                              if (printingOptions.pageColors) {
                                if (Array.isArray(printingOptions.pageColors)) {
                                  // For array format, check all files (legacy UI - should be removed)
                                  isColor = printingOptions.pageColors.some(pc => pc.colorPages.includes(pageNum));
                                  isBw = printingOptions.pageColors.some(pc => pc.bwPages.includes(pageNum));
                                } else {
                                  isColor = printingOptions.pageColors.colorPages.includes(pageNum);
                                  isBw = printingOptions.pageColors.bwPages.includes(pageNum);
                                }
                              }
                              return (
                                <div
                                  key={pageNum}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                    isColor
                                      ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-sm'
                                      : isBw
                                      ? 'bg-gray-300 text-gray-800'
                                      : 'bg-gray-100 text-gray-500 border border-gray-300'
                                  }`}
                                  title={isColor ? `Page ${pageNum} - Color` : isBw ? `Page ${pageNum} - Black & White` : `Page ${pageNum} - Not specified`}
                                >
                                  {pageNum}
                      </div>
                              );
                            })}
                          </div>
                          {(() => {
                            if (!printingOptions.pageColors) return null;
                            let totalSpecified = 0;
                            if (Array.isArray(printingOptions.pageColors)) {
                              totalSpecified = printingOptions.pageColors.reduce((sum, pc) => sum + pc.colorPages.length + pc.bwPages.length, 0);
                            } else {
                              totalSpecified = printingOptions.pageColors.colorPages.length + printingOptions.pageColors.bwPages.length;
                            }
                            if (totalSpecified < pageCount) {
                              return (
                                <p className="text-xs text-yellow-600 mt-2">
                                  ⚠️ Not all pages are specified. Unspecified pages will be printed in Black & White.
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                      {/* Summary */}
                      <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                        <div className="text-sm text-blue-700">
                          <strong>Summary:</strong> {getPageColorPreview(pageCount, printingOptions.pageColors)}
                        </div>
                        {printingOptions.pageColors && (() => {
                          let colorCount = 0;
                          let bwCount = 0;
                          if (Array.isArray(printingOptions.pageColors)) {
                            colorCount = printingOptions.pageColors.reduce((sum, pc) => sum + pc.colorPages.length, 0);
                            bwCount = printingOptions.pageColors.reduce((sum, pc) => sum + pc.bwPages.length, 0);
                          } else {
                            colorCount = printingOptions.pageColors.colorPages.length;
                            bwCount = printingOptions.pageColors.bwPages.length;
                          }
                          return (
                            <div className="text-xs text-gray-600 mt-1">
                              Color: {colorCount} pages | 
                              B&W: {bwCount} pages | 
                              Unspecified: {pageCount - (colorCount + bwCount)} pages
                            </div>
                          );
                        })()}
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
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Files:</span>
                    <div className="text-right max-w-xs">
                      {selectedFiles.length > 0 ? (
                        <div className="space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-gray-800 truncate block">{truncateFileName(file.name)}</span>
                              <span className="text-xs text-gray-500">
                                {filePageCounts[index] || 1} page{filePageCounts[index] !== 1 ? 's' : ''}
                    </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-800">No files selected</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium text-gray-800">
                      {isCountingPages ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Counting...
                        </span>
                      ) : (
                        pageCount
                      )}
                    </span>
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
                  {printingOptions.color === 'mixed' && printingOptions.pageColors && (() => {
                    let colorCount = 0;
                    let bwCount = 0;
                    if (Array.isArray(printingOptions.pageColors)) {
                      colorCount = printingOptions.pageColors.reduce((sum, pc) => sum + pc.colorPages.length, 0);
                      bwCount = printingOptions.pageColors.reduce((sum, pc) => sum + pc.bwPages.length, 0);
                    } else {
                      colorCount = printingOptions.pageColors.colorPages.length;
                      bwCount = printingOptions.pageColors.bwPages.length;
                    }
                    return (
                      <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Color Pages:</span>
                      <span className="font-medium text-green-600">
                            {colorCount} pages
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">B&W Pages:</span>
                      <span className="font-medium text-gray-600">
                            {bwCount} pages
                      </span>
                    </div>
                      </>
                    );
                  })()}
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
                  {/* Service Options per File */}
                  {selectedFiles.length > 0 && printingOptions.serviceOptions && printingOptions.serviceOptions.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => {
                        const filePageCount = filePageCounts[index] || 1;
                        const minServiceFeePageLimit = pricingData?.additionalServices?.minServiceFeePageLimit || 1;
                        const fileServiceOption = printingOptions.serviceOptions?.[index];
                        
                        if (filePageCount > minServiceFeePageLimit && fileServiceOption) {
                          return (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">
                                {truncateFileName(file.name)}:
                              </span>
                              <span className="font-medium text-gray-800">
                                {fileServiceOption === 'binding' && `Binding (+₹${pricingData?.additionalServices?.binding || 20})`}
                                {fileServiceOption === 'file' && 'Plastic file (₹10)'}
                                {fileServiceOption === 'service' && `Service fee (₹${pricingData?.additionalServices?.minServiceFee || 5})`}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  {/* Legacy support for single serviceOption */}
                  {(!printingOptions.serviceOptions || printingOptions.serviceOptions.length === 0) && pageCount > 1 && printingOptions.serviceOption === 'binding' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Binding:</span>
                      <span className="font-medium text-blue-600">Yes (+₹{pricingData?.additionalServices?.binding || 20})</span>
                    </div>
                  )}
                  {(!printingOptions.serviceOptions || printingOptions.serviceOptions.length === 0) && pageCount > 1 && printingOptions.serviceOption === 'file' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Plastic file:</span>
                      <span className="font-medium text-gray-800">₹10</span>
                    </div>
                  )}
                  {(!printingOptions.serviceOptions || printingOptions.serviceOptions.length === 0) && pageCount > (pricingData?.additionalServices?.minServiceFeePageLimit || 1) && printingOptions.serviceOption === 'service' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Service fee:</span>
                      <span className="font-medium text-gray-800">₹{pricingData?.additionalServices?.minServiceFee || 5}</span>
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

              {/* Upload More Button */}
              {selectedFiles.length > 0 && (
              <div className="text-center">
                <button
                  type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                    + Upload More Files
                </button>
              </div>
              )}

              </div>

            {/* Delivery Options Section - Inline after file upload */}
            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200 mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🚚 Delivery Options</h3>
                
                {/* Quick Customer Info - Only show if not in profile */}
                {isAuthenticated && (!customerInfo.phone || !selectedPickupLocation) && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-3">
                      <strong>Quick Info:</strong> {!customerInfo.phone && 'Add phone number'} {!customerInfo.phone && !selectedPickupLocation && 'and'} {!selectedPickupLocation && 'select pickup location'} to auto-fill next time!
                    </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!customerInfo.phone && (
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                      )}
                </div>
              </div>
                )}

                {!isAuthenticated && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      ⚠️ <strong>Sign in required:</strong> You need to sign in to place an order.
                      <a href="/auth/signin" className="text-blue-600 hover:text-blue-800 underline ml-1">Sign in here</a> or 
                      <a href="/auth/signup" className="text-blue-600 hover:text-blue-800 underline ml-1">create an account</a>.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="pickup"
                        checked={deliveryOption.type === 'pickup'}
                        onChange={() => setDeliveryOption({ type: 'pickup', pickupLocationId: selectedPickupLocation?._id })}
                        className="mr-2"
                      />
                      <span className="font-medium">🏫 Pickup from Campus (FREE)</span>
                    </label>
                  </div>

                  {deliveryOption.type === 'pickup' && (
                    <div className="ml-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-3">🏫 Select Pickup Location</h4>
                      
                      {pickupLocations.length > 0 ? (
                        <select
                          value={selectedPickupLocation?._id || ''}
                          onChange={async (e) => {
                            const location = pickupLocations.find(loc => loc._id === e.target.value);
                            setSelectedPickupLocation(location || null);
                            setDeliveryOption(prev => ({
                              ...prev,
                              pickupLocationId: location?._id
                            }));
                            
                            if (isAuthenticated && location) {
                              try {
                                await fetch('/api/user/profile', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ defaultLocationId: location._id }),
                                });
                              } catch (error) {
                                console.error('Error saving default location:', error);
                              }
                            }
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
                      ) : (
                        <p className="text-sm text-green-700">Loading pickup locations...</p>
                      )}
                    </div>
                  )}

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
                      <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Complete Address *
                            </label>
                            <textarea
                              required
                              value={deliveryOption.address || ''}
                            onChange={(e) => setDeliveryOption(prev => ({ ...prev, address: e.target.value }))}
                              rows={3}
                              placeholder="Enter your complete delivery address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                              <input
                                type="text"
                                required
                                value={deliveryOption.city || ''}
                              onChange={(e) => setDeliveryOption(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="City"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                              <input
                                type="text"
                                required
                                value={deliveryOption.pinCode || ''}
                              onChange={(e) => setDeliveryOption(prev => ({ ...prev, pinCode: e.target.value }))}
                              placeholder="PIN Code"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expected Delivery Date */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date *
                            </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                              </div>
                    </div>
                  )}
                </div>
              </div>

          {/* Right Column - Sticky Order Summary & Payment */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Order Summary</h3>
                
                {/* Quick Summary */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Files:</span>
                    <span className="font-medium">{selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}` : 'No files'}</span>
                        </div>
                  <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pages:</span>
                    <span className="font-medium">{isCountingPages ? '...' : pageCount}</span>
                        </div>
                  <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{printingOptions.pageSize}</span>
                        </div>
                  <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Color:</span>
                    <span className="font-medium">
                            {printingOptions.color === 'color' ? 'Color' : 
                       printingOptions.color === 'bw' ? 'B&W' : 'Mixed'}
                          </span>
                        </div>
                  <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Copies:</span>
                    <span className="font-medium">{printingOptions.copies}</span>
                        </div>
                  <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery:</span>
                    <span className="font-medium text-xs">
                      {deliveryOption.type === 'pickup' ? '🏫 Pickup' : '🚚 Delivery'}
                          </span>
                    </div>
                  </div>

                {/* Total Amount */}
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">Total:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">₹{amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Button */}
                  <button
                    onClick={handlePayment}
                  disabled={isProcessingPayment || !isRazorpayLoaded || !isAuthenticated || selectedFiles.length === 0 || !expectedDate || (deliveryOption.type === 'pickup' && !selectedPickupLocation) || (deliveryOption.type === 'delivery' && (!deliveryOption.address || !deliveryOption.city || !deliveryOption.pinCode))}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {!isAuthenticated ? '🔒 Sign In to Place Order' :
                   !isRazorpayLoaded ? '⏳ Loading...' : 
                     isProcessingPayment ? '🔄 Processing...' : 
                   `💳 Pay ₹${amount.toFixed(2)}`}
                  </button>

                {!isAuthenticated && (
                  <div className="mt-4 text-center">
                    <a href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-800 underline">
                      Sign in to continue
                    </a>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t space-y-2">
                  <div className="flex items-center text-xs text-gray-600">
                    <span className="mr-2">🔒</span>
                    <span>Secure Payment</span>
                </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <span className="mr-2">🚀</span>
                    <span>Fast Delivery</span>
              </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <span className="mr-2">⭐</span>
                    <span>1000+ Happy Customers</span>
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
