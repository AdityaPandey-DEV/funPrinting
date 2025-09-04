# PrintService - College Printing Solutions

A full-stack web application for college students to order printing services, featuring file uploads, professional templates, and secure payment processing.

## Features

### 🎯 Core Functionality
- **File Upload Printing**: Upload PDF, DOCX, JPG, JPEG, PNG files for printing
- **Professional Templates**: Auto-generate PDFs for assignments, resumes, lab reports, and certificates
- **Secure Payments**: Integrated Razorpay payment gateway
- **Order Management**: Track order status from pending to delivered
- **Admin Dashboard**: Manage orders and update statuses

### 🎨 User Experience
- **Modern UI**: Clean, responsive design using Tailwind CSS
- **Mobile First**: Optimized for both desktop and mobile devices
- **Real-time Updates**: Live order status tracking
- **PDF Preview**: Preview generated templates before ordering

### 🔒 Security & Reliability
- **File Storage**: Secure cloud storage with Cloudinary
- **Payment Verification**: Secure payment processing with signature verification
- **Data Protection**: MongoDB with proper data validation
- **Admin Authentication**: Secure admin access control

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Cloudinary
- **Payment**: Razorpay
- **PDF Generation**: pdf-lib
- **Deployment**: Vercel (Frontend/Backend), MongoDB Atlas

## Prerequisites

- Node.js 18+ 
- MongoDB database (local or Atlas)
- Cloudinary account
- Razorpay account

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd print
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/print-service
   
   # Razorpay (Test Mode)
   RAZORPAY_KEY_ID=rzp_test_your_test_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # NextAuth
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   
   # Admin credentials
   ADMIN_EMAIL=admin@printservice.com
   ADMIN_PASSWORD=admin123
   ```

4. **Database Setup**
   - Start MongoDB locally or use MongoDB Atlas
   - The application will automatically create collections on first use

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### MongoDB
- Set up a MongoDB database (local or Atlas)
- Update `MONGODB_URI` in your environment variables

### Cloudinary
1. Create a Cloudinary account
2. Get your cloud name, API key, and secret
3. Update the environment variables

### Razorpay
1. Create a Razorpay account
2. Get your test/live API keys
3. Update the environment variables
4. For production, switch to live mode

## Usage

### For Students
1. **Home Page**: Browse services and click "Order Now"
2. **File Upload**: Upload documents and select printing options
3. **Templates**: Choose from professional templates and customize
4. **Payment**: Complete payment through Razorpay
5. **Track Orders**: Monitor order status in "My Orders"

### For Admins
1. **Access Dashboard**: Navigate to `/admin`
2. **Login**: Use admin credentials (admin@printservice.com / admin123)
3. **Manage Orders**: View all orders and update statuses
4. **Download Files**: Access uploaded files and generated PDFs

## API Endpoints

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get student orders

### Payment
- `POST /api/payment/verify` - Verify Razorpay payment

### Templates
- `POST /api/templates/generate` - Generate PDF from template

### Admin
- `GET /api/admin/orders` - Get all orders
- `PATCH /api/admin/orders/[id]` - Update order status

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── contact/           # Contact page
│   ├── my-orders/         # Student orders page
│   ├── order/             # Order placement page
│   ├── return-policy/     # Return policy page
│   ├── templates/         # Templates page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/             # Reusable components
│   ├── Navbar.tsx         # Navigation bar
│   └── Footer.tsx         # Footer component
├── lib/                    # Utility libraries
│   ├── cloudinary.ts      # Cloudinary integration
│   ├── mongodb.ts         # Database connection
│   ├── pdfGenerator.ts    # PDF generation utilities
│   └── razorpay.ts        # Razorpay integration
└── models/                 # MongoDB models
    ├── Admin.ts           # Admin model
    └── Order.ts           # Order model
```

## Deployment

### Frontend & Backend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Database (MongoDB Atlas)
1. Create MongoDB Atlas cluster
2. Get connection string
3. Update `MONGODB_URI` in production environment

### File Storage (Cloudinary)
1. Use production Cloudinary account
2. Update environment variables

### Payment (Razorpay)
1. Switch to live mode
2. Update production API keys

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `NEXTAUTH_URL` | NextAuth URL | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: support@printservice.com
- Phone: +91 98765 43210
- Business Hours: Mon-Sat 9AM-6PM

## Roadmap

- [ ] User authentication system
- [ ] Bulk order processing
- [ ] Advanced template customization
- [ ] Real-time notifications
- [ ] Mobile app development
- [ ] Analytics dashboard
- [ ] Multi-language support

## Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- MongoDB for the database solution
- Razorpay for payment processing
- Cloudinary for file storage
- pdf-lib for PDF generation capabilities
