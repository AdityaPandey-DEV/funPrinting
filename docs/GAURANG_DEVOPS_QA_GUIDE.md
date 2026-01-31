# 🛠️ Gaurang - DevOps, Testing & Quality Assurance Technical Guide

## 👨‍💼 Role Overview
**Position:** DevOps, Testing & Quality Assurance Engineer  
**Primary Focus:** Deployment Management, Testing, Bug Tracking, Production Monitoring

### Your Superpower
Tum project ka guardian ho! Tumhara kaam hai ensure karna ki application production mein smoothly run kare, sab features test ho chuke hain, aur koi bug production mein nahi jaye. Tum quality ke watchdog ho!

---

## 📚 Your Responsibilities in Detail

### 1. DevOps & Deployment (40% time) - PRIMARY FOCUS

#### Vercel Deployment Architecture

```
CODE PUSH (GitHub)
      ↓
┌─────────────────────────────────────┐
│   VERCEL CI/CD PIPELINE             │
├─────────────────────────────────────┤
│ 1. Code checkout                    │
│ 2. Install dependencies             │
│ 3. Build Next.js app                │
│ 4. Run tests (optional)             │
│ 5. Deploy to production             │
└─────────────────────────────────────┘
      ↓
PRODUCTION (Live URL)
```

#### Vercel Configuration

**File:** `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "RAZORPAY_KEY_ID": "@razorpay_key_id",
    "CLOUDINARY_CLOUD_NAME": "@cloudinary_cloud_name"
  },
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

#### Environment Variables Setup

```bash
# Vercel Dashboard Steps:
1. Go to vercel.com → Your Project → Settings
2. Navigate to "Environment Variables"
3. Add each variable:

# Database
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/print-service

# Authentication
NEXTAUTH_SECRET = your_random_32_character_secret_key
NEXTAUTH_URL = https://your-domain.vercel.app

# Razorpay
RAZORPAY_KEY_ID = rzp_live_xxxxx (live keys for production)
RAZORPAY_KEY_SECRET = your_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret

# Google OAuth
GOOGLE_CLIENT_ID = your_client_id
GOOGLE_CLIENT_SECRET = your_client_secret

# Cloudmersive
CLOUDMERSIVE_API_KEY = your_api_key

# Important: Select "Production", "Preview", and "Development" scopes
```

#### Deployment Process

```bash
# Method 1: Automatic Deployment (Recommended)
# Push code to main branch - automatically deploys
git add .
git commit -m "Feature: Add new functionality"
git push origin main

# Vercel automatically:
# 1. Detects the push
# 2. Builds the project
# 3. Runs tests
# 4. Deploys to production

# Method 2: Manual Deployment via Vercel CLI
npm install -g vercel
vercel login
vercel --prod

# Method 3: Deploy from Dashboard
# Go to Vercel dashboard → Deployments → Redeploy
```

#### Deployment Checklist

```markdown
Pre-Deployment:
✅ All environment variables configured
✅ Database connection tested
✅ API endpoints tested
✅ Build successful locally (npm run build)
✅ No console errors
✅ All features working
✅ Mobile responsive
✅ Payment gateway tested

Post-Deployment:
✅ Check deployment logs
✅ Test live URL
✅ Verify all pages load
✅ Test critical flows (order, payment)
✅ Check error logs
✅ Monitor performance
```

---

### 2. Testing & Quality Assurance (35% time)

#### Testing Strategy

```
Testing Pyramid:
        /\
       /  \      Unit Tests (Future)
      /────\
     /      \    Integration Tests
    /────────\
   /          \  Manual Testing (Your Focus)
  /────────────\
```

#### Testing Scripts

**File:** `scripts/test-integration-complete.js`

```javascript
// Complete integration testing script
const fetch = require('node-fetch');

const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testIntegration() {
  console.log('🧪 Starting Integration Tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Health Check
  console.log('Test 1: API Health Check');
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-route`);
    if (response.ok) {
      console.log('✅ PASSED - API is responding\n');
      passedTests++;
    } else {
      console.log('❌ FAILED - API not responding\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED - Connection error\n');
    failedTests++;
  }

  // Test 2: Database Connection
  console.log('Test 2: Database Connection');
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-db`);
    const data = await response.json();
    if (data.success) {
      console.log('✅ PASSED - Database connected\n');
      passedTests++;
    } else {
      console.log('❌ FAILED - Database connection failed\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED - Database test error\n');
    failedTests++;
  }

  // Test 3: File Upload API
  console.log('Test 3: File Upload API');
  try {
    // Test with sample file
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('./test-files/sample.pdf'));
    
    const response = await fetch(`${API_BASE_URL}/api/upload-file`, {
      method: 'POST',
      body: form,
    });
    
    if (response.ok) {
      console.log('✅ PASSED - File upload working\n');
      passedTests++;
    } else {
      console.log('❌ FAILED - File upload failed\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED - File upload error:', error.message, '\n');
    failedTests++;
  }

  // Test 4: PDF to Word Conversion
  console.log('Test 4: PDF to Word Conversion');
  try {
    // Add your conversion test here
    console.log('⏭️  SKIPPED - Requires API key\n');
  } catch (error) {
    console.log('❌ FAILED\n');
    failedTests++;
  }

  // Summary
  console.log('═══════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════\n');
}

testIntegration().catch(console.error);
```

#### Manual Testing Checklist

**Create this file:** `TESTING_CHECKLIST.md`

```markdown
# Testing Checklist

## Authentication Tests
- [ ] User signup with email/password
- [ ] User login with credentials
- [ ] Google OAuth login
- [ ] Logout functionality
- [ ] Session persistence
- [ ] Protected routes redirect to login

## Order Flow Tests
- [ ] File upload (PDF, DOCX, images)
- [ ] Order options selection (copies, color, sides)
- [ ] Pickup location selection
- [ ] Price calculation correct
- [ ] Order creation success
- [ ] Order visible in "My Orders"

## Payment Tests
- [ ] Razorpay checkout opens
- [ ] Payment success flow
- [ ] Payment failure handling
- [ ] Order status updates after payment
- [ ] Payment verification working

## Admin Panel Tests
- [ ] Admin login
- [ ] View all orders
- [ ] Update order status
- [ ] View user details
- [ ] Template management
- [ ] Pricing configuration

## Template Tests
- [ ] Browse templates
- [ ] Fill template form
- [ ] Preview generated PDF
- [ ] Download PDF
- [ ] Order from template

## Responsive Tests
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] All pages responsive
- [ ] Images load properly
- [ ] Forms work on mobile

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome)

## Performance Tests
- [ ] Page load time < 3s
- [ ] Images optimized
- [ ] No console errors
- [ ] API response time < 1s
- [ ] Database queries optimized
```

#### Bug Reporting Template

**Create GitHub Issue with this template:**

```markdown
## 🐛 Bug Report

### Description
Brief description of the bug

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Screenshots
If applicable, add screenshots

### Environment
- Browser: [e.g., Chrome 120]
- Device: [e.g., iPhone 12, Desktop]
- OS: [e.g., iOS 15, Windows 11]
- URL: [e.g., https://app.vercel.app/order]

### Priority
- [ ] Critical (Blocks major functionality)
- [ ] High (Major feature broken)
- [ ] Medium (Minor feature issue)
- [ ] Low (Cosmetic issue)

### Assigned To
@aditya @vivek @kartik

### Related Issues
Links to related issues
```

---

### 3. Monitoring & Logs (15% time)

#### Vercel Analytics Setup

```bash
# Vercel automatically provides:
1. Real-time logs
2. Function execution logs
3. Build logs
4. Deployment logs

# Access them:
1. Go to vercel.com → Your Project
2. Click on "Logs" tab
3. Filter by:
   - Time range
   - Function name
   - Status code
   - Search term
```

#### Error Monitoring

```typescript
// Add to your API routes for better logging
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Your code here
    
    // Log success
    console.log(`✅ GET /api/orders - Success - ${Date.now() - startTime}ms`);
    
  } catch (error: any) {
    // Log error with details
    console.error(`❌ GET /api/orders - Error:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`,
    });
    
    throw error;
  }
}
```

#### Production Monitoring Checklist

```markdown
Daily Checks (Every Morning):
- [ ] Check deployment status (green/red)
- [ ] Review error logs (last 24 hours)
- [ ] Check API response times
- [ ] Verify database connection
- [ ] Check storage usage (Cloudinary)
- [ ] Monitor Razorpay transactions

Weekly Checks:
- [ ] Analyze usage statistics
- [ ] Review performance metrics
- [ ] Check for outdated dependencies
- [ ] Review and close resolved issues
- [ ] Update documentation

Monthly Checks:
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Cost analysis (Vercel, MongoDB, Cloudinary)
- [ ] Backup verification
- [ ] Dependency updates
```

---

### 4. Scripts & Automation (10% time)

#### Setup Scripts

**File:** `scripts/setup-admin.js`

```javascript
// Initialize admin user in database
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin user...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Import Admin model
    const Admin = require('../src/models/Admin').default;
    
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: 'admin@printservice.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists\n');
      return;
    }
    
    // Create new admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await Admin.create({
      email: 'admin@printservice.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    });
    
    console.log('✅ Admin user created successfully!\n');
    console.log('Email: admin@printservice.com');
    console.log('Password: admin123\n');
    console.log('⚠️  Please change password after first login!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

setupAdmin();
```

#### Testing Automation Script

```bash
#!/bin/bash
# File: scripts/run-all-tests.sh

echo "🧪 Running All Tests..."
echo "======================="

# Test 1: Database Connection
echo "\n📊 Test 1: Database Connection"
node scripts/test-db.js

# Test 2: API Endpoints
echo "\n📊 Test 2: API Endpoints"
node scripts/test-api-endpoint.js

# Test 3: Integration Tests
echo "\n📊 Test 3: Integration Tests"
node scripts/test-integration-complete.js

# Test 4: Cloudmersive API
echo "\n📊 Test 4: Document Conversion"
node scripts/test-cloudmersive-simple.js

echo "\n✅ All tests completed!"
echo "Check results above for any failures."
```

---

## 🎯 Your Daily Tasks

### Morning Routine (9:00 AM - 12:00 PM)
```
9:00 - 9:15   → Check production status & logs
9:15 - 9:30   → Review overnight errors
9:30 - 10:00  → Daily standup with team
10:00 - 11:00 → Run testing scripts
11:00 - 12:00 → Bug verification & reporting
```

### Afternoon Routine (1:00 PM - 5:00 PM)
```
1:00 - 2:00   → Manual testing (new features)
2:00 - 3:00   → Deployment tasks (if needed)
3:00 - 4:00   → Documentation updates
4:00 - 5:00   → Performance monitoring & optimization
```

### Evening Routine (5:00 PM - 6:00 PM)
```
5:00 - 5:30   → Daily report generation
5:30 - 6:00   → Plan tomorrow's tasks
```

---

## 🎓 Viva Questions & Answers

**Q: Vercel kya hai aur kyun use karte hain?**
**A:** Vercel ek cloud platform hai jo Next.js applications ko deploy karne ke liye specially designed hai. Ye automatic deployments, serverless functions, edge network, aur built-in analytics provide karta hai. GitHub se directly integrate hota hai aur har push pe automatically deploy ho jata hai.

**Q: CI/CD kya hai?**
**A:** CI/CD matlab Continuous Integration aur Continuous Deployment. Jab bhi code change hota hai, automatically build, test, aur deploy ho jata hai. Isse manual deployment ki zaroorat nahi padti aur bugs jaldi catch ho jate hain.

**Q: Environment variables kyun use karte hain?**
**A:** Security ke liye. Sensitive information jaise API keys, database passwords, etc. code mein directly nahi likhte. Environment variables mein store karte hain jo sirf server pe accessible hote hain, GitHub pe visible nahi hote.

**Q: Testing kyun zaroori hai?**
**A:** Testing se ensure hota hai ki application properly kaam kar raha hai. Bugs production mein jane se pehle catch ho jate hain. User experience better hota hai aur production mein less issues aate hain.

**Q: Production monitoring kaise karte ho?**
**A:** Vercel logs check karte hain, error tracking karte hain, performance metrics monitor karte hain, aur user reports track karte hain. Daily/weekly checklist follow karte hain.

---

## 💡 Pro Tips

1. **Automate Everything:** Jo bhi repeat hota hai use script bana do
2. **Monitor Daily:** Production ko daily check karo
3. **Document Issues:** Har bug properly document karo
4. **Test Thoroughly:** Feature deploy karne se pehle thoroughly test karo
5. **Keep Backups:** Regular backups maintain karo
6. **Stay Updated:** Security updates aur dependency updates regular karo

---

## 📊 Weekly Report Template

```markdown
# Weekly DevOps & QA Report

## Week: [Date Range]

### Deployment Summary
- Total Deployments: X
- Successful: X
- Failed: X
- Average Build Time: X seconds

### Testing Summary
- Features Tested: X
- Bugs Found: X
- Bugs Fixed: X
- Tests Passed: X/X

### Issues
#### Critical
- [List critical issues]

#### High Priority
- [List high priority issues]

#### Medium/Low
- [List other issues]

### Performance Metrics
- Average Page Load Time: X seconds
- API Response Time: X ms
- Uptime: X%

### Action Items for Next Week
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Notes
- Any other observations or recommendations
```

---

## 🔧 Useful Commands

```bash
# Vercel CLI Commands
vercel login                    # Login to Vercel
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel logs                     # View logs
vercel env ls                   # List environment variables
vercel env add                  # Add environment variable

# Testing Commands
npm run test-integration        # Run integration tests
npm run test-db                 # Test database connection
npm run test-cloudmersive       # Test document conversion

# Development Commands
npm run dev                     # Start development server
npm run build                   # Build for production
npm run start                   # Start production server
npm run lint                    # Run linter
```

---

**Your Mission:** Keep the production stable and bug-free! 🛡️

**Created for:** Gaurang (DevOps & QA Engineer)  
**Last Updated:** October 29, 2025

