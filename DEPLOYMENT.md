# Deployment Guide

This guide will help you deploy the PrintService application to production.

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- MongoDB Atlas account (free tier available)
- Cloudinary account (free tier available)
- Razorpay account

## Step 1: Prepare Your Repository

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Ensure all environment variables are properly set in your local `.env.local`**

## Step 2: Deploy to Vercel

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Environment Variables**
   Add all your environment variables in the Vercel dashboard:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   RAZORPAY_KEY_ID=your_live_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_live_razorpay_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   NEXTAUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be available at `https://your-project.vercel.app`

## Step 3: MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a new cluster (free tier available)
   - Choose your preferred cloud provider and region

2. **Database Access**
   - Create a database user with read/write permissions
   - Remember username and password

3. **Network Access**
   - Add `0.0.0.0/0` to allow connections from anywhere
   - Or restrict to Vercel's IP ranges for better security

4. **Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Update `MONGODB_URI` in Vercel

## Step 4: Cloudinary Setup

1. **Create Account**
   - Go to [Cloudinary](https://cloudinary.com)
   - Sign up for free account

2. **Get Credentials**
   - Go to Dashboard
   - Copy Cloud Name, API Key, and API Secret
   - Update environment variables in Vercel

## Step 5: Razorpay Setup

1. **Create Account**
   - Go to [Razorpay](https://razorpay.com)
   - Sign up and complete KYC

2. **Get API Keys**
   - Go to Settings > API Keys
   - Generate new key pair
   - Copy Key ID and Key Secret
   - Update environment variables in Vercel

3. **Webhook Setup** (Optional)
   - Add webhook URL: `https://your-domain.vercel.app/api/payment/verify`
   - Select events: `payment.captured`

## Step 6: Domain Setup (Optional)

1. **Custom Domain**
   - In Vercel dashboard, go to Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - Update `NEXTAUTH_URL` to your custom domain
   - Update Razorpay webhook URL if using webhooks

## Step 7: Post-Deployment

1. **Test the Application**
   - Visit your deployed URL
   - Test all major functionality
   - Verify payment processing works

2. **Setup Admin User**
   ```bash
   # Set environment variables locally
   export MONGODB_URI=your_production_mongodb_uri
   
   # Run setup script
   npm run setup-admin
   ```

3. **Monitor Logs**
   - Check Vercel function logs for any errors
   - Monitor MongoDB Atlas for database performance

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/print-service` |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | `rzp_live_xxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | `your-random-secret-here` |
| `NEXTAUTH_URL` | Your application URL | `https://your-domain.vercel.app` |

## Security Considerations

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use Vercel's environment variable encryption
   - Rotate API keys regularly

2. **Database Security**
   - Use strong passwords for database users
   - Restrict network access when possible
   - Enable MongoDB Atlas security features

3. **Payment Security**
   - Always verify payment signatures
   - Use HTTPS in production
   - Implement proper error handling

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript compilation errors
   - Verify all dependencies are installed
   - Check environment variable syntax

2. **Database Connection Issues**
   - Verify MongoDB Atlas network access
   - Check connection string format
   - Ensure database user has correct permissions

3. **Payment Issues**
   - Verify Razorpay API keys are correct
   - Check webhook configuration
   - Test with Razorpay test mode first

### Getting Help

- Check Vercel function logs
- Monitor MongoDB Atlas metrics
- Review Razorpay dashboard for payment issues
- Check browser console for frontend errors

## Performance Optimization

1. **Database Indexing**
   - Add indexes on frequently queried fields
   - Monitor query performance in MongoDB Atlas

2. **Image Optimization**
   - Use Cloudinary's optimization features
   - Implement lazy loading for images

3. **Caching**
   - Consider implementing Redis for session storage
   - Use Next.js built-in caching features

## Monitoring and Maintenance

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Update environment variables as needed

2. **Backup Strategy**
   - MongoDB Atlas provides automatic backups
   - Consider additional backup solutions for critical data

3. **Performance Monitoring**
   - Use Vercel Analytics
   - Monitor MongoDB Atlas performance
   - Track user experience metrics
