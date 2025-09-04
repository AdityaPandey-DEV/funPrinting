# Adobe PDF Services API Setup Guide

## 🚀 **Get FREE Adobe PDF Services API Credentials**

### **Step 1: Create Adobe Developer Account**
1. Go to: https://developer.adobe.com/
2. Click **"Get Started"** or **"Sign In"**
3. Create a free Adobe ID account if you don't have one

### **Step 2: Create a New Project**
1. Once logged in, go to: https://developer.adobe.com/console/
2. Click **"Create new project"**
3. Choose **"Add an API"**
4. Select **"PDF Services API"**
5. Click **"Next"**

### **Step 3: Get Your Credentials**
After creating the project, you'll get:
- **Client ID** (starts with `...`)
- **Client Secret** (starts with `...`)
- **Organization ID** (starts with `...`)
- **Account ID** (starts with `...`)

### **Step 4: Set Up Environment Variables**

1. **Copy the `env.template` file to `.env.local`:**
   ```bash
   cp env.template .env.local
   ```

2. **Edit `.env.local` and replace the Adobe credentials:**
   ```env
   # Adobe PDF Services API Configuration (FREE)
   ADOBE_CLIENT_ID=your_actual_client_id_here
   ADOBE_CLIENT_SECRET=your_actual_client_secret_here
   ADOBE_ORG_ID=your_actual_organization_id_here
   ADOBE_ACCOUNT_ID=your_actual_account_id_here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

### **Step 5: Test the Integration**

1. Go to: `http://localhost:3000/admin/templates/dynamic/upload`
2. Upload a PDF file
3. You should see a message: **"PDF converted to Word using real Adobe PDF Services API"**
4. The content will now be extracted from your actual PDF instead of mock data

## 🎯 **What This Enables**

- ✅ **Real PDF Content Extraction**: Your actual PDF content will be converted
- ✅ **Professional Quality**: Adobe's industry-leading PDF processing
- ✅ **Table Preservation**: Maintains all tables and formatting
- ✅ **Structure Recognition**: Automatically detects headings, lists, and tables
- ✅ **FREE Usage**: Adobe provides free tier with generous limits

## 🔧 **Troubleshooting**

If you see **"Adobe credentials not found, using mock conversion..."**:
1. Check that `.env.local` file exists
2. Verify all 4 Adobe credentials are set
3. Restart the development server
4. Check the browser console for any error messages

## 📞 **Need Help?**

- Adobe Documentation: https://developer.adobe.com/document-services/docs/
- Adobe Support: https://developer.adobe.com/support/
