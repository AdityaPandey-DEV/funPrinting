# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your PrintService application.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "PrintService Auth")
5. Click "Create"

## Step 2: Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Enable the following APIs:
   - **Google+ API** or **Google Identity**: Search for "Google+ API" or "Google Identity" and enable it
   - **People API**: Search for "People API" and enable it (required for phone number access)

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "PrintService"
     - User support email: Your email
     - Developer contact information: Your email
   - Add your domain to authorized domains
   - In the "Scopes" section, add the following scopes:
     - `../auth/userinfo.email` (View your email address)
     - `../auth/userinfo.profile` (View your basic profile info)
     - Note: Phone number scope removed to avoid verification issues
   - Save and continue through the steps

4. For the OAuth client:
   - Application type: "Web application"
   - Name: "PrintService Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)

5. Click "Create"
6. Copy the Client ID and Client Secret

## Step 4: Update Environment Variables

Add the following to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_secure_random_string_here
NEXTAUTH_URL=http://localhost:3000
```

## Step 5: Generate NextAuth Secret

Generate a secure random string for `NEXTAUTH_SECRET`:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/signin`
3. Try signing in with Google
4. Check the browser console and server logs for any errors

## Production Setup

For production deployment:

1. Update the OAuth consent screen with your production domain
2. Add your production domain to authorized origins and redirect URIs
3. Update `NEXTAUTH_URL` to your production URL
4. Ensure all environment variables are set in your production environment

## Troubleshooting

### Common Issues:

1. **"Error 400: redirect_uri_mismatch"**
   - Make sure the redirect URI in Google Console exactly matches your callback URL
   - Check that you're using the correct domain (localhost vs production)

2. **"This app isn't verified"**
   - This is normal for development. Click "Advanced" > "Go to [App Name] (unsafe)"
   - For production, you'll need to verify your app with Google

3. **"Access blocked"**
   - Check that the Google+ API is enabled
   - Verify your OAuth consent screen is properly configured

### Testing Checklist:

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] People API enabled
- [ ] OAuth 2.0 credentials created
- [ ] OAuth consent screen configured with basic scopes (email, profile)
- [ ] Environment variables set
- [ ] NextAuth secret generated
- [ ] Sign-in page accessible
- [ ] Google sign-in button works
- [ ] User data saved to database (phone numbers will be collected via forms)
- [ ] Session persists after page refresh

## Phone Number Access Notes

**Important**: Google's phone number access has specific requirements:

1. **Verification Required**: Your app must be verified by Google to access phone numbers
2. **User Consent**: Users must explicitly grant permission for phone number access
3. **Limited Availability**: Not all users have phone numbers associated with their Google accounts
4. **Fallback Handling**: The app gracefully handles cases where phone numbers are not available

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique secrets for production
- Regularly rotate your OAuth credentials
- Monitor your Google Cloud Console for unusual activity
- Consider implementing additional security measures like rate limiting
- Handle phone number data according to privacy regulations (GDPR, CCPA, etc.)

## Support

If you encounter issues:
1. Check the browser console for client-side errors
2. Check the server logs for backend errors
3. Verify all environment variables are correctly set
4. Ensure your Google Cloud Console configuration matches your application setup
