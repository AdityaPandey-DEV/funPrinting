/**
 * Utility for persisting order state to sessionStorage
 * Used to preserve file uploads and form data during Google OAuth redirect
 */

export interface SavedFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  data: string; // base64 encoded
}

export interface SavedOrderState {
  selectedFiles: SavedFile[];
  fileURLs: string[];
  orderType: 'file' | 'template';
  printingOptions: {
    pageSize?: 'A4' | 'A3';
    color?: 'color' | 'bw' | 'mixed';
    sided?: 'single' | 'double';
    copies?: number;
    serviceOption?: 'binding' | 'file' | 'service';
    serviceOptions?: ('binding' | 'file' | 'service')[];
    pageColors?: {
      colorPages: number[];
      bwPages: number[];
    } | Array<{
      colorPages: number[];
      bwPages: number[];
    }>;
    fileOptions?: Array<{
      pageSize: 'A4' | 'A3';
      color: 'color' | 'bw' | 'mixed';
      sided: 'single' | 'double';
      copies: number;
      pageColors?: {
        colorPages: number[];
        bwPages: number[];
      };
    }>;
  };
  expectedDate: string;
  pageCount: number;
  filePageCounts: number[];
  pdfUrls: string[];
  pdfLoaded: boolean;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  deliveryOption: {
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
  };
  selectedPickupLocation: {
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
  } | null;
  colorPagesInput: string;
  colorPagesInputs: string[];
  colorPagesValidations: Array<{ errors: string[]; warnings: string[] }>;
  timestamp: number;
}

const STORAGE_KEY = 'orderState_googleOAuth';
const MAX_STORAGE_AGE = 10 * 60 * 1000; // 10 minutes

/**
 * Convert File object to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 string back to File object
 */
function base64ToFile(savedFile: SavedFile): File {
  // Convert base64 to binary string
  const binaryString = atob(savedFile.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create Blob and then File
  const blob = new Blob([bytes], { type: savedFile.type });
  const file = new File([blob], savedFile.name, {
    type: savedFile.type,
    lastModified: savedFile.lastModified,
  });
  
  return file;
}

/**
 * Save order state to sessionStorage
 * Converts File objects to base64 for storage
 */
export async function saveOrderState(state: {
  selectedFiles: File[];
  fileURLs: string[];
  orderType: 'file' | 'template';
  printingOptions: SavedOrderState['printingOptions'];
  expectedDate: string;
  pageCount: number;
  filePageCounts: number[];
  pdfUrls: string[];
  pdfLoaded: boolean;
  customerInfo: SavedOrderState['customerInfo'];
  deliveryOption: SavedOrderState['deliveryOption'];
  selectedPickupLocation: SavedOrderState['selectedPickupLocation'];
  colorPagesInput: string;
  colorPagesInputs: string[];
  colorPagesValidations: Array<{ errors: string[]; warnings: string[] }>;
}): Promise<void> {
  try {
    // Convert File objects to SavedFile format
    const savedFiles: SavedFile[] = await Promise.all(
      state.selectedFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        data: await fileToBase64(file),
      }))
    );

    const savedState: SavedOrderState = {
      selectedFiles: savedFiles,
      fileURLs: state.fileURLs,
      orderType: state.orderType,
      printingOptions: state.printingOptions,
      expectedDate: state.expectedDate,
      pageCount: state.pageCount,
      filePageCounts: state.filePageCounts,
      pdfUrls: state.pdfUrls,
      pdfLoaded: state.pdfLoaded,
      customerInfo: state.customerInfo,
      deliveryOption: state.deliveryOption,
      selectedPickupLocation: state.selectedPickupLocation,
      colorPagesInput: state.colorPagesInput,
      colorPagesInputs: state.colorPagesInputs,
      colorPagesValidations: state.colorPagesValidations,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    console.log('✅ Order state saved to sessionStorage');
  } catch (error) {
    console.error('Error saving order state:', error);
    throw error;
  }
}

/**
 * Restored order state with File objects (not SavedFile)
 */
export interface RestoredOrderState extends Omit<SavedOrderState, 'selectedFiles'> {
  selectedFiles: File[];
}

/**
 * Restore order state from sessionStorage
 * Converts base64 strings back to File objects
 */
export async function restoreOrderState(): Promise<RestoredOrderState | null> {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const savedState: SavedOrderState = JSON.parse(saved);

    // Check if state is too old (stale)
    const age = Date.now() - savedState.timestamp;
    if (age > MAX_STORAGE_AGE) {
      console.log('⚠️ Saved order state is too old, discarding');
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Convert SavedFile objects back to File objects
    const restoredFiles = savedState.selectedFiles.map(base64ToFile);

    // Recreate object URLs for file previews
    const restoredFileURLs = restoredFiles.map(file => URL.createObjectURL(file));

    console.log('✅ Order state restored from sessionStorage');

    return {
      ...savedState,
      selectedFiles: restoredFiles, // Return as File[] objects
      fileURLs: restoredFileURLs,
    };
  } catch (error) {
    console.error('Error restoring order state:', error);
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Clear saved order state from sessionStorage
 */
export function clearOrderState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  console.log('✅ Order state cleared from sessionStorage');
}

/**
 * Check if there's saved order state
 */
export function hasSavedOrderState(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Helper to convert SavedFile[] to File[] for use in components
 */
export function convertSavedFilesToFiles(savedFiles: SavedFile[]): File[] {
  return savedFiles.map(base64ToFile);
}

