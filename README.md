# 🖨️ College Printing Service - BTech Project

A full-stack web application for college students to order printing services online with file uploads, professional document templates, and secure payment processing.

**Live Demo:** [fun-printing.vercel.app](https://fun-printing.vercel.app)

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🎯 Core Functionality
- **File Upload Printing** - Upload PDF, DOCX, JPG, JPEG, PNG files for printing
- **Professional Templates** - Auto-generate PDFs for assignments, resumes, lab reports, and certificates
- **Document Conversion** - PDF to DOCX and DOCX to PDF conversion using Cloudmersive API
- **Secure Payments** - Integrated Razorpay payment gateway with signature verification
- **Order Management** - Real-time order tracking from pending to delivered
- **Admin Dashboard** - Comprehensive admin panel to manage orders, templates, and pricing

### 🎨 User Experience
- **Modern UI** - Clean, responsive design using Tailwind CSS
- **Mobile First** - Optimized for both desktop and mobile devices
- **Real-time Updates** - Live order status tracking
- **PDF Preview** - Preview generated templates before ordering
- **User Authentication** - Secure login with Google OAuth

### 🔒 Security & Reliability
- **File Storage** - Secure cloud storage with Cloudinary
- **Payment Verification** - Secure payment processing with signature verification
- **Data Protection** - MongoDB with proper data validation
- **Admin Authentication** - Secure admin access control
- **Webhook Integration** - Automatic payment status updates

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14, React, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | MongoDB with Mongoose ODM |
| **File Storage** | Cloudinary |
| **Payment Gateway** | Razorpay |
| **Authentication** | NextAuth.js, Google OAuth |
| **PDF Processing** | pdf-lib, Cloudmersive API |
| **Document Processing** | docxtemplater, Adobe PDF Services |
| **Deployment** | Vercel (Frontend/Backend), MongoDB Atlas |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed and set up:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** - Local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
- **Cloudinary** account ([Sign up](https://cloudinary.com/))
- **Razorpay** account ([Sign up](https://razorpay.com/))
- **Google OAuth** credentials ([Console](https://console.developers.google.com/))
- **Cloudmersive API** key ([Get free key](https://cloudmersive.com/)) - 800 conversions/month free

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/AdityaPandey-DEV/funPrinting.git
cd funPrinting
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
Copy the template and fill in your credentials:
```bash
cp env.template .env.local
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/print-service
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/print-service

# Razorpay Configuration (Test Mode)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Admin Configuration
ADMIN_EMAIL=admin@printservice.com
ADMIN_PASSWORD=admin123

# Cloudmersive API Configuration (FREE - 800 conversions/month)
CLOUDMERSIVE_API_KEY=your_cloudmersive_api_key

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
EMAIL_PORT=587

# Razorpay Fallback Configuration
RAZORPAY_FALLBACK_ENABLED=true

# Cron Job Configuration
CRON_SECRET=your_cron_secret_key
```

### Getting API Keys & Credentials

#### MongoDB Atlas
1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user with read/write permissions
3. Add `0.0.0.0/0` to network access
4. Copy connection string and update `MONGODB_URI`

#### Cloudinary
1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard to get Cloud Name, API Key, and API Secret

#### Razorpay
1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings > API Keys
3. Generate test mode keys
4. For webhooks: Set URL to `https://your-domain.vercel.app/api/payment/verify`

#### Google OAuth
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### Cloudmersive API
1. Sign up at [Cloudmersive](https://cloudmersive.com/)
2. Get free API key (800 conversions/month)
3. Use in `CLOUDMERSIVE_API_KEY`

---

## 🏃 Running the Application

### Development Mode
```bash
# Start development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### Setup Scripts (Optional)
```bash
# Initialize admin user
npm run setup-admin

# Setup pricing configuration
npm run setup-pricing

# Setup sample templates
npm run setup-sample-templates

# Setup Cloudmersive API
npm run setup-cloudmersive
```

### Testing Scripts
```bash
# Test Cloudmersive integration
npm run test-cloudmersive-simple

# Test complete integration
npm run test-integration

# Test Adobe integration (if configured)
npm run test-adobe
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
funPrinting/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── admin/         # Admin API endpoints
│   │   │   ├── orders/        # Order management APIs
│   │   │   ├── payment/       # Payment processing APIs
│   │   │   ├── templates/     # Template APIs
│   │   │   └── convert-*/     # Document conversion APIs
│   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── orders/        # Order management
│   │   │   ├── templates/     # Template management
│   │   │   ├── pricing/       # Pricing configuration
│   │   │   └── pickup-locations/ # Pickup locations
│   │   ├── auth/              # Authentication pages
│   │   ├── order/             # Order placement page
│   │   ├── my-orders/         # User orders page
│   │   ├── templates/         # Template browsing & filling
│   │   ├── contact/           # Contact page
│   │   ├── privacy/           # Privacy policy
│   │   ├── terms/             # Terms of service
│   │   └── page.tsx           # Home page
│   ├── components/            # Reusable React components
│   │   ├── Navbar.tsx         # Navigation bar
│   │   ├── Footer.tsx         # Footer component
│   │   ├── OrderCard.tsx      # Order display card
│   │   └── ...                # Other components
│   ├── lib/                   # Utility libraries
│   │   ├── cloudinary.ts      # Cloudinary integration
│   │   ├── mongodb.ts         # Database connection
│   │   ├── razorpay.ts        # Razorpay integration
│   │   ├── cloudmersive.ts    # Document conversion
│   │   ├── pdfGenerator.ts    # PDF generation
│   │   └── ...                # Other utilities
│   ├── models/                # MongoDB models
│   │   ├── Order.ts           # Order model
│   │   ├── User.ts            # User model
│   │   ├── Admin.ts           # Admin model
│   │   ├── DynamicTemplate.ts # Template model
│   │   └── ...                # Other models
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useRazorpay.ts     # Payment hook
│   │   └── ...                # Other hooks
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── scripts/                   # Setup and utility scripts
├── test-files/                # Test files for development
├── .env.local                 # Environment variables (create this)
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

---

## 📖 Usage Guide

### For Students

1. **Browse Services**
   - Visit the home page
   - View available printing services and templates

2. **Upload Files for Printing**
   - Click "Order Now"
   - Upload PDF, DOCX, or image files
   - Select printing options (color, sides, pages)
   - Choose pickup location
   - Complete payment

3. **Use Professional Templates**
   - Go to Templates page
   - Select a template (Assignment, Resume, etc.)
   - Fill in the form with your details
   - Preview the generated PDF
   - Place order and complete payment

4. **Track Orders**
   - Go to "My Orders" page
   - View order status (Pending, Processing, Ready, Delivered)
   - Download generated files
   - Contact admin for support

### For Admins

1. **Access Admin Dashboard**
   - Navigate to `/admin`
   - Login with admin credentials

2. **Manage Orders**
   - View all orders in the system
   - Update order status
   - Download uploaded files
   - Process payments

3. **Manage Templates**
   - Upload new templates (PDF)
   - System auto-converts to DOCX
   - Edit template metadata
   - Set pricing

4. **Configure Pricing**
   - Set prices for different services
   - Configure pickup locations
   - Manage printing options

---

## 🔌 API Endpoints

### Public APIs

#### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/[id]` - Get order details

#### Payment
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment signature
- `POST /api/payment/webhook` - Razorpay webhook handler

#### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates/generate` - Generate PDF from template
- `GET /api/templates/[id]` - Get template details

#### Document Conversion
- `POST /api/convert-pdf-to-word` - Convert PDF to DOCX
- `POST /api/convert-word-to-pdf` - Convert DOCX to PDF

### Admin APIs

#### Order Management
- `GET /api/admin/orders` - Get all orders
- `PATCH /api/admin/orders/[id]` - Update order status
- `DELETE /api/admin/orders/[id]` - Delete order

#### Template Management
- `POST /api/admin/upload-pdf` - Upload template PDF
- `POST /api/admin/save-template` - Save template configuration
- `GET /api/admin/templates` - List all templates
- `DELETE /api/admin/templates/[id]` - Delete template

#### Configuration
- `GET /api/admin/pricing` - Get pricing configuration
- `POST /api/admin/pricing` - Update pricing
- `GET /api/admin/pickup-locations` - Get pickup locations
- `POST /api/admin/pickup-locations` - Update pickup locations

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Configure project settings

3. **Set Environment Variables**
   - Add all variables from `.env.local` to Vercel dashboard
   - Update `NEXTAUTH_URL` to your production URL
   - Use live Razorpay keys for production

4. **Deploy**
   - Click "Deploy"
   - Application will be live at `https://your-project.vercel.app`

### Production Checklist

- [ ] Set up MongoDB Atlas with production cluster
- [ ] Use live Razorpay API keys
- [ ] Configure custom domain (optional)
- [ ] Set up Razorpay webhooks
- [ ] Test payment processing in production
- [ ] Monitor application logs and errors
- [ ] Set up email notifications
- [ ] Configure CORS for production domain

---

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check MongoDB URI format
# Ensure IP whitelist includes 0.0.0.0/0 for Atlas
# Verify database user has correct permissions
```

#### Payment Issues
```bash
# Verify Razorpay API keys
# Check webhook configuration
# Test with test mode first
# Verify signature calculation
```

#### File Upload Issues
```bash
# Check Cloudinary credentials
# Verify file size limits
# Check network connectivity
# Review browser console for errors
```

#### Document Conversion Issues
```bash
# Verify Cloudmersive API key
# Check API quota limits (800/month free)
# Review conversion logs
# Test with sample files
```

### Getting Help

- Check browser console for frontend errors
- Review Vercel function logs for backend errors
- Monitor MongoDB Atlas for database issues
- Check Razorpay dashboard for payment issues
- Review Cloudinary media library for file storage issues

---

## 👨‍💻 Development Team

**Project:** BTech 5th Semester Web Development Project  
**Developer:** Aditya Pandey  
**Email:** adityapandey.dev.in@gmail.com  
**GitHub:** [@AdityaPandey-DEV](https://github.com/AdityaPandey-DEV)

---

## 📄 License

This project is developed as a BTech academic project and is open-source under the MIT License.

---

## 🙏 Acknowledgments

- **Next.js Team** - Amazing React framework
- **Vercel** - Seamless deployment platform
- **MongoDB** - Reliable database solution
- **Razorpay** - Secure payment processing
- **Cloudinary** - File storage and delivery
- **Cloudmersive** - Document conversion API
- **Tailwind CSS** - Utility-first CSS framework

---

## 📞 Support

For questions or support:
- **Email:** support@printservice.com
- **Phone:** +91 98765 43210
- **Hours:** Mon-Sat 9AM-6PM

---

**Made with ❤️ by Aditya Pandey for BTech 5th Semester Project**
