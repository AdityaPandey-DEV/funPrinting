# Oracle Cloud Infrastructure (OCI) Setup Guide

This guide will help you set up Oracle Cloud Object Storage as your file storage provider, replacing Cloudinary's 4MB file size limit with unlimited file sizes and 20GB of free storage.

## Benefits of Oracle Cloud Storage

- **20GB Free Storage**: 10GB standard + 10GB infrequent access
- **No File Size Limits**: Upload files of any size
- **No API Call Limits**: Unlimited uploads and downloads
- **Full API Access**: Complete control over your storage
- **No Forced Upgrades**: Free tier doesn't expire

## Prerequisites

1. An Oracle Cloud account (free tier available)
2. Basic understanding of cloud storage concepts

## Step 1: Create Oracle Cloud Account

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Click "Start for Free"
3. Fill in your details and verify your email
4. Complete the account setup process

## Step 2: Create Object Storage Bucket

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com/)
2. Navigate to **Menu** → **Storage** → **Buckets**
3. Select your compartment (or create a new one)
4. Click **Create Bucket**
5. Configure the bucket:
   - **Name**: `print-service-files` (or your preferred name)
   - **Storage Tier**: Standard
   - **Encryption**: Use Oracle-managed keys (default)
   - **Visibility**: Private (recommended)
6. Click **Create**

## Step 3: Get Your Namespace

1. In the Buckets page, look at the top of the page
2. You'll see "Namespace: `your-namespace`"
3. Copy this namespace value - you'll need it for configuration

## Step 4: Create API Key

1. Navigate to **Menu** → **Identity** → **Users**
2. Click on your user (or create a new user for API access)
3. Scroll down to **API Keys** section
4. Click **Add API Key**
5. Select **Paste Public Key** (we'll generate this next)
6. Open terminal and run:
   ```bash
   mkdir -p ~/.oci
   openssl genrsa -out ~/.oci/oci_api_key.pem 2048
   openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem
   ```
7. Copy the contents of `~/.oci/oci_api_key_public.pem`:
   ```bash
   cat ~/.oci/oci_api_key_public.pem
   ```
8. Paste the public key into the Oracle Cloud Console
9. Click **Add**
10. Copy the **Fingerprint** shown - you'll need this

## Step 5: Get Required OCIDs

### Tenancy OCID
1. Navigate to **Menu** → **Administration** → **Tenancy Details**
2. Copy the **OCID** value

### User OCID
1. Navigate to **Menu** → **Identity** → **Users**
2. Click on your user
3. Copy the **OCID** value

### Compartment OCID (Optional)
1. Navigate to **Menu** → **Identity** → **Compartments**
2. Click on your compartment
3. Copy the **OCID** value (or use tenancy OCID)

## Step 6: Get Region Identifier

1. In the Oracle Cloud Console, look at the top right
2. You'll see your region (e.g., "US East (Ashburn)")
3. Find the corresponding region identifier:
   - US East (Ashburn): `us-ashburn-1`
   - US West (Phoenix): `us-phoenix-1`
   - EU (Frankfurt): `eu-frankfurt-1`
   - EU (London): `uk-london-1`
   - Asia Pacific (Tokyo): `ap-tokyo-1`
   - Asia Pacific (Seoul): `ap-seoul-1`
   - Asia Pacific (Mumbai): `ap-mumbai-1`
   - Asia Pacific (Sydney): `ap-sydney-1`

## Step 7: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Storage Provider Selection
STORAGE_PROVIDER=oracle

# Oracle Cloud Infrastructure Configuration
OCI_TENANCY_OCID=ocid1.tenancy.oc1..your_tenancy_ocid_here
OCI_USER_OCID=ocid1.user.oc1..your_user_ocid_here
OCI_FINGERPRINT=aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99
OCI_REGION=us-ashburn-1
OCI_NAMESPACE=your_namespace_here
OCI_BUCKET_NAME=print-service-files

# Option 1: Use private key file path (recommended for local development)
OCI_PRIVATE_KEY_PATH=~/.oci/oci_api_key.pem

# Option 2: Use private key content (recommended for cloud deployment)
# OCI_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----

# Optional: Compartment OCID (defaults to tenancy OCID if not set)
# OCI_COMPARTMENT_OCID=ocid1.compartment.oc1..your_compartment_ocid_here
```

### For Cloud Deployment (Vercel, etc.)

For cloud platforms, use the `OCI_PRIVATE_KEY` environment variable instead of the file path:

1. Read your private key:
   ```bash
   cat ~/.oci/oci_api_key.pem
   ```
2. Copy the entire key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`
3. Replace all newlines with `\n` (or paste as-is if your platform supports multiline env vars)
4. Add to your platform's environment variables

## Step 8: Install Dependencies

The `oci-sdk` package is already added to `package.json`. Install it:

```bash
npm install
```

## Step 9: Test the Configuration

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Try uploading a file through your application
3. Check the console logs for Oracle Cloud upload messages
4. Verify the file appears in your Oracle Cloud bucket

## Troubleshooting

### Error: "Missing required Oracle Cloud configuration"
- Check that all required environment variables are set
- Verify the variable names match exactly (case-sensitive)

### Error: "Private key file not found"
- Verify the path to your private key file
- For cloud deployment, use `OCI_PRIVATE_KEY` instead of `OCI_PRIVATE_KEY_PATH`

### Error: "Bucket not found"
- Verify the bucket name matches exactly
- Check that the bucket exists in the specified namespace
- Ensure you have permissions to access the bucket

### Error: "Authentication failed"
- Verify your fingerprint matches the one in Oracle Cloud Console
- Check that your private key is correct
- Ensure your user has the necessary permissions

### Error: "Region not found"
- Verify the region identifier is correct
- Use the format: `us-ashburn-1` (not `US East (Ashburn)`)

## Security Best Practices

1. **Never commit private keys to version control**
   - Add `~/.oci/` to your `.gitignore`
   - Use environment variables for cloud deployment

2. **Use IAM policies to restrict access**
   - Create a user specifically for API access
   - Grant only necessary permissions (Object Storage access)

3. **Rotate keys periodically**
   - Generate new keys every 90 days
   - Remove old keys from Oracle Cloud Console

4. **Use compartments for organization**
   - Create separate compartments for different environments
   - Apply appropriate policies to each compartment

## Switching Back to Cloudinary

If you need to switch back to Cloudinary temporarily:

1. Set `STORAGE_PROVIDER=cloudinary` in your `.env.local`
2. Ensure Cloudinary environment variables are set
3. Restart your application

## Additional Resources

- [Oracle Cloud Object Storage Documentation](https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/objectstorageoverview.htm)
- [OCI SDK for Node.js](https://docs.oracle.com/en-us/iaas/tools/node/latest/)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)

## Support

If you encounter issues:
1. Check the application logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test your Oracle Cloud credentials using the OCI CLI
4. Review Oracle Cloud documentation for API-specific errors

