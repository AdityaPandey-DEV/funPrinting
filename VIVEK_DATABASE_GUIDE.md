# 👨‍💻 Vivek - Database Lead & DBMS Architect Technical Guide

## 👨‍💼 Role Overview
**Position:** Database Lead & DBMS Architect  
**Primary Focus:** **Database Design, Query Optimization, Data Modeling** (DBMS Project Focus)

### Your Superpower
Kyunki ye ek **DBMS (Database Management System) project** hai, tum project ka most important person ho! Tumhara kaam hai **complete MongoDB database architecture** design karna, **10+ models** create karna, queries optimize karna, aur indexing implement karna. Database performance tumhari responsibility hai!

---

## 📚 Your Responsibilities in Detail

### 1. Database Architecture & Design (40% time) - PRIMARY FOCUS (DBMS PROJECT)

#### Database Architecture Overview

```
APPLICATION LAYER (Aditya's APIs)
      ↓
      │ Uses Models Created by You
      │
┌─────▼────────────────────────────────────────────────────┐
│              YOUR DATABASE MODELS                         │
│              (Mongoose Schemas)                           │
├───────────────────────────────────────────────────────────┤
│ 1. Schema Definition (Structure)                          │
│ 2. Data Types (String, Number, Boolean, etc.)           │
│ 3. Validation Rules (Required, Min, Max, etc.)          │
│ 4. Indexes (For Fast Queries)                           │
│ 5. Relationships (References to Other Collections)       │
└─────┬────────────────────────────────────────────────────┘
      │
      │ Mongoose ODM
      │
┌─────▼────────────────────────────────────────────────────┐
│              MONGODB DATABASE                             │
│              (Document Storage)                           │
├───────────────────────────────────────────────────────────┤
│ Collections:                                              │
│ • users (User documents)                                 │
│ • orders (Order documents)                               │
│ • admins (Admin documents)                               │
│ • +7 more collections                                    │
└───────────────────────────────────────────────────────────┘
```

**What is Mongoose?**
Mongoose ek Object Data Modeling (ODM) library hai jo MongoDB aur Node.js ke beech bridge ka kaam karti hai. Ye features provide karti hai:
- Schema definition (structure define karna)
- Data validation (data check karna)
- Type casting (data types manage karna)
- Query building (database queries banana)
- Middleware (hooks for operations)

**What is a Schema?**
Schema ek blueprint hai jo define karta hai ki:
- Document mein kaunse fields honge
- Har field ka data type kya hoga
- Kaunse fields required hain
- Default values kya hongi
- Validation rules kya honge

**What is a Model?**
Model ek constructor function hai jo:
- Schema ko use karke documents create karta hai
- Database operations perform karta hai (CRUD)
- Queries run karta hai

#### Example API: Create Order

**File:** `src/app/api/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order'; // Aditya's model use karo
import { getServerSession } from 'next-auth';

// POST /api/orders - New order create karna
export async function POST(req: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Step 2: Database connect karo
    await connectDB();

    // Step 3: Request body parse karo
    const body = await req.json();
    const { items, pickupLocation, totalAmount } = body;

    // Step 4: Input validation
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in order' },
        { status: 400 }
      );
    }

    if (!pickupLocation) {
      return NextResponse.json(
        { error: 'Pickup location is required' },
        { status: 400 }
      );
    }

    // Step 5: Order number generate karo
    const orderNumber = `ORD${Date.now()}`;

    // Step 6: Order create karo (Aditya's model use karke)
    const order = await Order.create({
      userId: session.user.id,
      orderNumber,
      items,
      totalAmount,
      pickupLocation,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    // Step 7: Success response
    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      },
    }, { status: 201 });

  } catch (error: any) {
    // Step 8: Error handling
    console.error('Order creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create order',
      message: error.message,
    }, { status: 500 });
  }
}

// GET /api/orders - User ki sari orders fetch karna
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Query parameters (pagination)
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Fetch orders with pagination
    const orders = await Order.find({ userId: session.user.id })
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .lean(); // Performance ke liye

    // Total count for pagination
    const total = await Order.countDocuments({ userId: session.user.id });

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
```

#### API Best Practices

```typescript
// 1. Consistent Error Handling
export function handleAPIError(error: any, context: string) {
  console.error(`${context} error:`, error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return {
      status: 400,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((e: any) => e.message),
    };
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    return {
      status: 409,
      message: 'Duplicate entry exists',
    };
  }
  
  // Default error
  return {
    status: 500,
    message: 'Internal server error',
  };
}

// 2. Input Validation Helper
export function validateOrderInput(data: any) {
  const errors: string[] = [];
  
  if (!data.items || !Array.isArray(data.items)) {
    errors.push('Items must be an array');
  }
  
  if (data.totalAmount && data.totalAmount < 0) {
    errors.push('Total amount cannot be negative');
  }
  
  if (!data.pickupLocation) {
    errors.push('Pickup location is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// 3. Success Response Helper
export function successResponse(data: any, message?: string, status = 200) {
  return NextResponse.json({
    success: true,
    message: message || 'Operation successful',
    data,
  }, { status });
}

// 4. Error Response Helper
export function errorResponse(message: string, status = 500, errors?: any) {
  return NextResponse.json({
    success: false,
    error: message,
    ...(errors && { errors }),
  }, { status });
}
```

---

### 2. Document Processing (30% time)

#### PDF to DOCX Conversion

**File:** `src/app/api/convert-pdf-to-word/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { convertPDFtoWord } from '@/lib/cloudmersive';

export async function POST(req: NextRequest) {
  try {
    // Step 1: Form data parse karo
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // Step 2: File validation
    if (file.type !== 'application/pdf') {
      return errorResponse('Only PDF files allowed', 400);
    }

    // File size check (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse('File size exceeds 10MB', 400);
    }

    // Step 3: File ko buffer mein convert karo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Step 4: Cloudmersive API se convert karo
    const result = await convertPDFtoWord(buffer);

    // Step 5: Response send karo
    return new NextResponse(result, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.docx')}"`,
      },
    });

  } catch (error: any) {
    console.error('PDF to Word conversion error:', error);
    return errorResponse('Conversion failed', 500);
  }
}
```

#### Cloudmersive Integration

**File:** `src/lib/cloudmersive.ts`

```typescript
import fetch from 'node-fetch';
import FormData from 'form-data';

const CLOUDMERSIVE_API_KEY = process.env.CLOUDMERSIVE_API_KEY!;
const API_BASE_URL = 'https://api.cloudmersive.com/convert';

// PDF to DOCX conversion
export async function convertPDFtoWord(pdfBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  formData.append('inputFile', pdfBuffer, 'input.pdf');

  const response = await fetch(`${API_BASE_URL}/pdf/to/docx`, {
    method: 'POST',
    headers: {
      'Apikey': CLOUDMERSIVE_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  return buffer;
}

// DOCX to PDF conversion
export async function convertWordtoPDF(docxBuffer: Buffer): Promise<Buffer> {
  const formData = new FormData();
  formData.append('inputFile', docxBuffer, 'input.docx');

  const response = await fetch(`${API_BASE_URL}/docx/to/pdf`, {
    method: 'POST',
    headers: {
      'Apikey': CLOUDMERSIVE_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  return buffer;
}

// Extract text from PDF
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('inputFile', pdfBuffer, 'input.pdf');

  const response = await fetch(`${API_BASE_URL}/pdf/to/txt`, {
    method: 'POST',
    headers: {
      'Apikey': CLOUDMERSIVE_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Text extraction failed: ${response.statusText}`);
  }

  const text = await response.text();
  return text;
}
```

---

### 3. Third-Party Integrations (20% time)

#### Cloudinary File Upload

**File:** `src/lib/cloudinary.ts`

```typescript
import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = 'print-service'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: fileName,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    ).end(fileBuffer);
  });
}

// Delete file from Cloudinary
export async function deleteFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw error;
  }
}
```

#### File Upload API

**File:** `src/app/api/upload-file/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      buffer,
      file.name,
      'user-uploads'
    );

    return successResponse({
      url: result.url,
      publicId: result.publicId,
      fileName: file.name,
    }, 'File uploaded successfully');

  } catch (error) {
    console.error('File upload error:', error);
    return errorResponse('File upload failed', 500);
  }
}
```

---

### 4. Admin APIs (10% time)

#### Admin Order Management

**File:** `src/app/api/admin/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifyAdminAuth } from '@/lib/adminAuth';

// GET /api/admin/orders - All orders fetch karna
export async function GET(req: NextRequest) {
  try {
    // Admin authentication check
    const admin = await verifyAdminAuth(req);
    if (!admin) {
      return errorResponse('Admin access required', 403);
    }

    await connectDB();

    // Query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Fetch orders
    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    return successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    return errorResponse('Failed to fetch orders', 500);
  }
}
```

---

## 🎯 Your Daily Tasks

### Morning (9:00 AM - 12:00 PM)
1. **9:00 - 9:30** → Check overnight errors aur logs
2. **9:30 - 10:00** → Daily standup (Aditya ke saath)
3. **10:00 - 12:00** → New API endpoints develop karna

### Afternoon (1:00 PM - 5:00 PM)
1. **1:00 - 3:00** → Document processing features
2. **3:00 - 4:00** → API testing (Postman)
3. **4:00 - 5:00** → Bug fixes aur optimization

### Evening (5:00 PM - 6:00 PM)
1. **5:00 - 5:30** → API documentation update
2. **5:30 - 6:00** → Tomorrow ka plan

---

## 🎓 Viva Questions & Answers

**Q: API endpoint kaise design karte ho?**
**A:** RESTful principles follow karte hain:
- GET → Data fetch karna
- POST → Naya data create karna
- PUT/PATCH → Data update karna
- DELETE → Data delete karna
Proper HTTP status codes use karte hain aur consistent response format maintain karte hain.

**Q: Error handling kaise karte ho?**
**A:** Try-catch blocks use karte hain, errors ko log karte hain, aur user-friendly error messages return karte hain with appropriate HTTP status codes (400 for client errors, 500 for server errors).

**Q: Cloudmersive API kya hai?**
**A:** Ye ek third-party document conversion API hai jo PDF to DOCX aur DOCX to PDF conversion karta hai. Hum isko use karte hain kyunki document conversion complex hai aur ye ready-made solution provide karta hai.

**Q: File upload kaise handle karte ho?**
**A:** Form data parse karte hain, file validation karte hain (type aur size check), buffer mein convert karte hain, aur Cloudinary pe upload karte hain. Cloudinary URL save karte hain database mein.

---

## 💡 Pro Tips

1. **Always Validate Input:** User se aane wala data kabhi trust mat karo
2. **Use Try-Catch:** Har API mein proper error handling honi chahiye
3. **Log Everything:** Console.log se debugging easy hoti hai
4. **Test APIs:** Postman se har API test karo before deployment
5. **Document APIs:** Comments likho aur Postman collection maintain karo

---

**Your Mission:** Backend ko rock-solid banao! 🚀

**Created for:** Vivek (Backend Developer)  
**Last Updated:** October 29, 2025

