# 🎨 Kartik - Frontend & UI Developer Technical Guide

## 👨‍💼 Role Overview
**Position:** Frontend & UI Developer  
**Primary Focus:** User Interface, User Experience, Responsive Design, Component Development

### Your Superpower
Tum frontend ka artist ho! Tumhara kaam hai beautiful, responsive, aur user-friendly interfaces banana. Users jo dekhte hain aur jo interact karte hain, wo sab tumhara kaam hai. Tum project ki face ho!

---

## 📚 Your Responsibilities in Detail

### 1. User Interface Development (50% time) - PRIMARY FOCUS

#### Component Architecture

```
APP STRUCTURE
├── Layout (Navbar + Footer)
├── Pages
│   ├── Home Page (Landing)
│   ├── Order Page (File upload + options)
│   ├── Templates Page (Browse templates)
│   ├── My Orders (Track orders)
│   └── Static Pages (Terms, Privacy, etc.)
└── Reusable Components
    ├── Buttons
    ├── Forms
    ├── Cards
    ├── Modals
    └── Loading States
```

#### Example: Order Page Component

**File:** `src/app/order/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function OrderPage() {
  
  // ═══════════════════════════════════════════════════════════
  // REACT HOOKS SECTION - State Management
  // ═══════════════════════════════════════════════════════════
  
  // Hook 1: useState for File Management
  const [file, setFile] = useState<File | null>(null);
  
  /* useState DETAILED EXPLANATION:
   * 
   * useState ek React Hook hai jo component mein state manage karta hai
   * 
   * Syntax: const [stateVariable, setStateFunction] = useState(initialValue);
   * 
   * - stateVariable: Current value hold karta hai
   * - setStateFunction: Value update karne ke liye function
   * - initialValue: Starting value (here: null)
   * 
   * Example:
   * const [file, setFile] = useState<File | null>(null);
   * 
   * file: Currently selected file (initially null)
   * setFile: Function to update file
   * <File | null>: TypeScript type (File object ya null)
   * 
   * Kaise use karte hain:
   * setFile(newFile);  // file ki value update ho jayegi
   * console.log(file); // Updated value milega
   * 
   * Important: State update hone par component re-render hota hai!
   */
  
  // Hook 2: useState for Loading State
  const [loading, setLoading] = useState(false);
  
  /* Loading State Explanation:
   * 
   * loading: Boolean value (true/false)
   * Purpose: User ko batana ki koi operation progress mein hai
   * 
   * Jab API call start ho:
   * setLoading(true);  // Button disabled ho jata hai, spinner dikhta hai
   * 
   * Jab API call complete ho:
   * setLoading(false); // Button enable, spinner hide
   * 
   * UI mein use:
   * <button disabled={loading}>
   *   {loading ? 'Processing...' : 'Submit'}
   * </button>
   */
  
  // Hook 3: useState for Options (Complex Object)
  const [options, setOptions] = useState({
    copies: 1,
    color: false,
    sides: 'single' as 'single' | 'double',
    pickupLocation: '',
  });
  
  /* Complex Object State Explanation:
   * 
   * Ye ek object state hai jisme multiple properties hain:
   * - copies: number (kitne copies print karni hain)
   * - color: boolean (color printing ya black & white)
   * - sides: string union type (single ya double sided)
   * - pickupLocation: string (kahan se pickup karna hai)
   * 
   * Object State Update Kaise Karte Hain:
   * 
   * Method 1: Spread Operator (Recommended)
   * setOptions({
   *   ...options,        // Purane values copy karo
   *   copies: 5          // Sirf copies update karo
   * });
   * 
   * Method 2: Direct object (Har value specify karo)
   * setOptions({
   *   copies: 5,
   *   color: true,
   *   sides: 'double',
   *   pickupLocation: 'Library'
   * });
   * 
   * Spread Operator (...) Explanation:
   * const obj = { a: 1, b: 2 };
   * const newObj = { ...obj, c: 3 };
   * // newObj = { a: 1, b: 2, c: 3 }
   * 
   * const updated = { ...obj, a: 10 };
   * // updated = { a: 10, b: 2 }
   */
  
  // Hook 4: useRouter for Navigation
  const router = useRouter();
  
  /* useRouter Explanation:
   * 
   * Next.js ka router hook hai navigation ke liye
   * 
   * Common Methods:
   * 1. router.push('/path')     - Navigate to new page
   * 2. router.back()            - Go back (browser back button)
   * 3. router.replace('/path')  - Replace current page (no history)
   * 4. router.refresh()         - Reload current page
   * 
   * Example:
   * router.push('/payment/123'); // Payment page pe jao
   */

  // ═══════════════════════════════════════════════════════════
  // EVENT HANDLERS SECTION
  // ═══════════════════════════════════════════════════════════
  
  // Handler 1: File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    
    /* Function Parameters Explanation:
     * 
     * e: React.ChangeEvent<HTMLInputElement>
     * 
     * - e: Event object (jab bhi input change hota hai ye trigger hota hai)
     * - React.ChangeEvent: React ka change event type
     * - <HTMLInputElement>: Specific input element type
     * 
     * Event Object (e) mein kya hota hai:
     * - e.target: Jis element pe event hua (input field)
     * - e.target.value: Input ki current value
     * - e.target.files: Selected files (for file input)
     * - e.preventDefault(): Default behavior stop karo
     */
    
    // Optional Chaining se first file extract karo
    const selectedFile = e.target.files?.[0];
    
    /* Optional Chaining (?.) Detailed Explanation:
     * 
     * e.target.files?.[] kya hai?
     * 
     * Normal way (without ?):
     * const file = e.target.files[0];
     * Problem: Agar files null hai to error ayega
     * 
     * Safe way (with ?):
     * const file = e.target.files?.[0];
     * Agar files null/undefined hai to selectedFile = undefined
     * 
     * Array Access with Optional Chaining:
     * - files?.[0] = Pehla file (if exists)
     * - files?.[0] same as files && files[0]
     */
    
    if (selectedFile) {
      // File Selection Validation
      
      // Step 1: File Size Validation
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      
      /* Size Calculation Explanation:
       * 1 KB = 1024 bytes
       * 1 MB = 1024 KB = 1024 * 1024 bytes
       * 10 MB = 10 * 1024 * 1024 bytes = 10,485,760 bytes
       */
      
      if (selectedFile.size > maxSize) {
        // File size check
        alert('File size should be less than 10MB');
        return; // Function exit - file set nahi karenge
      }
      
      /* File Object Properties:
       * selectedFile.name       - File name (e.g., "document.pdf")
       * selectedFile.size       - File size in bytes
       * selectedFile.type       - MIME type (e.g., "application/pdf")
       * selectedFile.lastModified - Timestamp
       */
      
      // Step 2: Set File in State
      setFile(selectedFile);
      // State update → Component re-render → UI update
    }
  };

  // Handler 2: Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    
    /* async Function Explanation:
     * 
     * async keyword function ko asynchronous banata hai
     * 
     * Normal function:
     * function submit() { return "done"; }
     * 
     * Async function:
     * async function submit() { return "done"; }
     * // Actually returns: Promise { "done" }
     * 
     * Async functions automatically Promise return karte hain
     * Andar await use kar sakte hain
     */
    
    // Prevent Default Form Submission
    e.preventDefault();
    
    /* preventDefault() Explanation:
     * 
     * By default, form submit hone par page reload hota hai
     * 
     * Without preventDefault():
     * <form onSubmit={handleSubmit}>
     *   Page reload ho jayega → Data loss
     * 
     * With preventDefault():
     * e.preventDefault();
     * Page reload nahi hoga → JavaScript handle karega
     * 
     * Other Events where preventDefault() useful:
     * - Link clicks: e.preventDefault() → Link follow nahi hoga
     * - Context menu: e.preventDefault() → Right-click menu nahi khulega
     */
    
    // Validation Step 1: Check File
    if (!file) {
      alert('Please select a file');
      return; // Early return - aage ka code execute nahi hoga
    }
    
    /* Early Return Pattern:
     * 
     * Ye pattern code ko clean rakhta hai
     * 
     * Bad way (nested if):
     * if (file) {
     *   if (pickupLocation) {
     *     if (copies > 0) {
     *       // Main logic deeply nested
     *     }
     *   }
     * }
     * 
     * Good way (early return):
     * if (!file) return;
     * if (!pickupLocation) return;
     * if (copies <= 0) return;
     * // Main logic - not nested
     */
    
    // Validation Step 2: Check Pickup Location
    if (!options.pickupLocation) {
      alert('Please select pickup location');
      return;
    }
    
    // Start Loading State
    setLoading(true);
    
    /* Loading State Flow:
     * 
     * 1. User clicks Submit
     * 2. setLoading(true) → Button disabled, spinner shows
     * 3. API calls execute
     * 4. setLoading(false) → Button enabled again
     * 
     * This prevents:
     * - Multiple submissions
     * - User confusion
     * - Duplicate API calls
     */
    
    // Try-Catch for Error Handling
    try {
      /* Try-Catch Block Explanation:
       * 
       * try {
       *   // Risky code jisme error aa sakta hai
       * } catch (error) {
       *   // Error handling code
       * } finally {
       *   // Always runs (optional)
       * }
       * 
       * Example:
       * try {
       *   const data = JSON.parse(invalidJSON);
       * } catch (error) {
       *   console.log("Invalid JSON");
       * }
       */
      // ═══ STEP 1: Upload File to Server ═══
      
      // Create FormData object
      const formData = new FormData();
      
      /* FormData Explanation:
       * 
       * FormData ek special object hai jo files aur data send karne ke liye use hota hai
       * 
       * Why FormData?
       * - Files ko directly JSON mein nahi bhej sakte
       * - multipart/form-data encoding chahiye
       * - Browser automatically correct headers set karta hai
       * 
       * Methods:
       * formData.append(key, value) - Add data
       * formData.get(key)          - Get data
       * formData.delete(key)       - Remove data
       * 
       * Example:
       * const fd = new FormData();
       * fd.append('file', fileObject);
       * fd.append('name', 'John');
       * fd.append('age', '25');
       */
      
      formData.append('file', file);
      // 'file' = key name (server pe isi name se access hoga)
      // file = actual File object from state
      
      // API Call using fetch()
      const uploadResponse = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });
      
      /* fetch() Detailed Explanation:
       * 
       * fetch() browser ka built-in function hai HTTP requests ke liye
       * 
       * Basic Syntax:
       * fetch(url, options)
       * 
       * Parameters:
       * 1. url: '/api/upload-file' (endpoint)
       * 2. options: {
       *      method: 'GET' | 'POST' | 'PUT' | 'DELETE'
       *      headers: { 'Content-Type': 'application/json' }
       *      body: JSON.stringify(data) or FormData
       *    }
       * 
       * await keyword:
       * - fetch() Promise return karta hai
       * - await Promise resolve hone tak wait karta hai
       * - Result mein Response object milta hai
       * 
       * Response Object Properties:
       * - response.ok: Boolean (200-299 status = true)
       * - response.status: Number (200, 404, 500, etc.)
       * - response.json(): Parse response as JSON
       * - response.text(): Get response as text
       */
      
      // Check if upload was successful
      if (!uploadResponse.ok) {
        // ok = false means status not in 200-299 range
        throw new Error('File upload failed');
        
        /* throw new Error() Explanation:
         * 
         * Error object create karke throw karta hai
         * Immediately catch block mein chala jata hai
         * 
         * Flow:
         * try {
         *   throw new Error('Something wrong');
         *   console.log('This will not execute');
         * } catch (error) {
         *   console.log(error.message); // "Something wrong"
         * }
         */
      }
      
      // Parse JSON response
      const uploadData = await uploadResponse.json();
      
      /* .json() Method Explanation:
       * 
       * Response body ko JSON format mein parse karta hai
       * Ye bhi Promise return karta hai, isliye await use karte hain
       * 
       * Server Response:
       * {
       *   "success": true,
       *   "data": {
       *     "url": "https://cloudinary.com/abc123.pdf",
       *     "publicId": "abc123"
       *   }
       * }
       * 
       * uploadData.data.url = File URL
       * uploadData.data.publicId = Cloudinary ID
       */
      
      // Step 2: Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            fileName: file.name,
            fileUrl: uploadData.data.url,
            pages: 1, // Calculate from PDF
            copies: options.copies,
            color: options.color,
            sides: options.sides,
          }],
          pickupLocation: options.pickupLocation,
          totalAmount: calculateAmount(),
        }),
      });
      
      if (!orderResponse.ok) {
        throw new Error('Order creation failed');
      }
      
      const orderData = await orderResponse.json();
      
      // Step 3: Redirect to payment
      router.push(`/payment/${orderData.data.orderId}`);
      
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Price calculation
  const calculateAmount = () => {
    let basePrice = 2; // ₹2 per page
    if (options.color) basePrice += 3; // Color printing extra
    return basePrice * options.copies;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Place Your Print Order
        </h1>
        
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-lg font-medium mb-2">
              Upload File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                {file ? (
                  <div>
                    <p className="text-green-600 font-medium">
                      ✓ {file.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, DOCX, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Print Options */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Copies */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Copies
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={options.copies}
                onChange={(e) => setOptions({
                  ...options,
                  copies: parseInt(e.target.value)
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Color Printing */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Printing Type
              </label>
              <select
                value={options.color ? 'color' : 'bw'}
                onChange={(e) => setOptions({
                  ...options,
                  color: e.target.value === 'color'
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>

            {/* Sides */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Print Sides
              </label>
              <select
                value={options.sides}
                onChange={(e) => setOptions({
                  ...options,
                  sides: e.target.value as 'single' | 'double'
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="single">Single Side</option>
                <option value="double">Double Side</option>
              </select>
            </div>

            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Pickup Location
              </label>
              <select
                value={options.pickupLocation}
                onChange={(e) => setOptions({
                  ...options,
                  pickupLocation: e.target.value
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Location</option>
                <option value="Library">Library</option>
                <option value="Canteen">Canteen</option>
                <option value="Main Gate">Main Gate</option>
              </select>
            </div>
          </div>

          {/* Price Display */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">
                ₹{calculateAmount()}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Proceed to Payment'
            )}
          </button>
        </form>
      </main>
      
      <Footer />
    </div>
  );
}
```

---

### 2. Responsive Design (25% time)

#### Tailwind CSS Breakpoints

```typescript
// Mobile First Approach

// Default (Mobile) - 0px+
<div className="text-sm px-4">
  Mobile layout
</div>

// Tablet - 640px+
<div className="sm:text-base sm:px-6">
  Tablet layout
</div>

// Desktop - 1024px+
<div className="lg:text-lg lg:px-8">
  Desktop layout
</div>

// Complete Example
<div className="
  // Mobile
  flex flex-col
  px-4 py-6
  text-sm
  
  // Tablet
  sm:px-6
  sm:py-8
  sm:text-base
  
  // Desktop
  lg:flex-row
  lg:px-12
  lg:py-10
  lg:text-lg
">
  Responsive content
</div>
```

#### Responsive Navbar Component

**File:** `src/components/Navbar.tsx`

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            PrintService
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/order" className="hover:text-blue-600 transition">
              Order Now
            </Link>
            <Link href="/templates" className="hover:text-blue-600 transition">
              Templates
            </Link>
            <Link href="/my-orders" className="hover:text-blue-600 transition">
              My Orders
            </Link>
            
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <Link
              href="/order"
              className="block py-2 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Order Now
            </Link>
            <Link
              href="/templates"
              className="block py-2 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Templates
            </Link>
            <Link
              href="/my-orders"
              className="block py-2 hover:text-blue-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Orders
            </Link>
            
            {session ? (
              <button
                onClick={() => signOut()}
                className="w-full text-left py-2 text-red-600"
              >
                Logout ({session.user?.name})
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="block py-2 text-blue-600 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
```

---

### 3. State Management (15% time)

#### Custom Hooks

**File:** `src/hooks/useAuth.ts`

```typescript
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(requireAuth: boolean = false) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [requireAuth, status, router]);

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}
```

**File:** `src/hooks/useDebounce.ts`

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage Example
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      // API call karke search results fetch karo
      fetchSearchResults(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

## 🎯 Your Daily Tasks

### Morning (9:00 AM - 12:00 PM)
1. **9:00 - 9:30** → Check design feedback aur issues
2. **9:30 - 10:00** → Daily standup
3. **10:00 - 12:00** → New UI components develop karna

### Afternoon (1:00 PM - 5:00 PM)
1. **1:00 - 3:00** → Pages develop karna / styling
2. **3:00 - 4:00** → Responsive testing (mobile, tablet, desktop)
3. **4:00 - 5:00** → Bug fixes aur UI polishing

### Evening (5:00 PM - 6:00 PM)
1. **5:00 - 5:30** → Browser compatibility testing
2. **5:30 - 6:00** → Tomorrow ka plan

---

## 🎓 Viva Questions & Answers

**Q: React hooks kya hain?**
**A:** Hooks special functions hain jo functional components mein state aur lifecycle features use karne dete hain. Main hooks: useState (state management), useEffect (side effects), useContext (context API), custom hooks (reusable logic).

**Q: Responsive design kaise implement karte ho?**
**A:** Mobile-first approach use karte hain, Tailwind CSS breakpoints use karte hain (sm:, md:, lg:, xl:), aur flexbox/grid layouts use karte hain. Sab devices pe test karte hain.

**Q: Component reusability kaise ensure karte ho?**
**A:** Props use karte hain, generic components banate hain, aur children prop use karte hain. Ek component multiple jagah use ho sake ye ensure karte hain.

**Q: State management kya hai?**
**A:** Application ka data manage karna. React mein useState hook use karte hain local state ke liye, aur complex cases mein Context API ya Redux use karte hain.

---

## 💡 Pro Tips

1. **Mobile First:** Pehle mobile design karo, phir desktop
2. **Component Library:** Reusable components banao
3. **Consistent Design:** Colors, fonts, spacing consistent rakho
4. **Loading States:** Har async operation mein loading indicator dikhaao
5. **Error Messages:** User-friendly error messages dikhaao
6. **Accessibility:** Keyboard navigation aur screen readers support karo

---

**Your Mission:** Beautiful UI banao jo users ko wow kar de! 🎨

**Created for:** Kartik (Frontend Developer)  
**Last Updated:** October 29, 2025

