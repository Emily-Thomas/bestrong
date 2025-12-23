# Vercel Blob Storage Setup Guide

This guide explains how to set up Vercel Blob storage for InBody scan file uploads in production.

## Overview

The file upload service automatically uses:
- **Local file storage** in development (saves to `uploads/` directory)
- **Vercel Blob storage** in production (when `BLOB_READ_WRITE_TOKEN` is set)

## Setup Steps

### 1. Create Vercel Blob Store

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Navigate to your project
3. Go to **Storage** tab (or **Settings** → **Storage**)
4. Click **Create Database** or **Add Storage**
5. Select **Blob** from the storage options
6. Give it a name (e.g., `bestrong-blob` or `inbody-scans`)
7. Click **Create**

### 2. Get the Blob Token

After creating the Blob store:

1. In the Blob store settings, find the **Tokens** section
2. Click **Create Token** or **Generate Token**
3. Set the token name (e.g., `read-write-token`)
4. Set permissions to **Read and Write** (or **Full Access**)
5. Copy the token (you'll only see it once!)

### 3. Add Environment Variable in Vercel

1. Go to your Vercel project **Settings**
2. Navigate to **Environment Variables**
3. Click **Add New**
4. Add the following:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Paste the token you copied in step 2
   - **Environment**: Select all environments (Production, Preview, Development)
5. Click **Save**

### 4. Redeploy

After adding the environment variable:

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **⋯** menu
4. Select **Redeploy**
5. Or push a new commit to trigger a new deployment

The environment variable will be available in the new deployment.

## Verification

After deployment, test the file upload:

1. Log into your application
2. Go to a client profile
3. Try uploading an InBody scan PNG file
4. The upload should succeed and the file should be stored in Vercel Blob

## How It Works

### Environment Detection

The system automatically detects the environment:

```typescript
// Production (Vercel)
if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.BLOB_READ_WRITE_TOKEN) {
  // Uses Vercel Blob storage
}

// Local Development
else {
  // Uses local file system (uploads/ directory)
}
```

### File Storage Paths

- **Production**: Files stored in Vercel Blob with URLs like:
  - `https://[project].blob.vercel-storage.com/inbody-scans/[clientId]/[timestamp]-[filename].png`
  
- **Local Dev**: Files stored locally at:
  - `backend/uploads/inbody-scans/[clientId]/[timestamp]-[filename].png`
  - Served via `/api/files/inbody-scans/...` route

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is required"

**Solution**: Make sure you've:
1. Created a Vercel Blob store
2. Generated a token with read/write permissions
3. Added `BLOB_READ_WRITE_TOKEN` to your Vercel environment variables
4. Redeployed after adding the variable

### Files Not Uploading

**Check**:
1. Verify the token has correct permissions (read + write)
2. Check Vercel deployment logs for errors
3. Verify the environment variable is set for the correct environment (Production/Preview)
4. Make sure you've redeployed after adding the variable

### Files Uploading But Not Accessible

**Check**:
1. Files are stored with `access: 'public'` by default
2. Verify the blob URL is being saved correctly in the database
3. Check if the file exists in Vercel Blob dashboard

## Environment Variables Summary

### Required for File Uploads
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (required for production)

### Already Required (Other Features)
- `POSTGRES_URL` - Database connection
- `JWT_SECRET` - Authentication
- `OPENAI_API_KEY` - AI recommendations

## Cost Considerations

Vercel Blob storage pricing:
- **Free tier**: 1 GB storage, 1 GB bandwidth/month
- **Pro tier**: $0.15/GB storage, $0.40/GB bandwidth
- Check current pricing at: https://vercel.com/pricing

For InBody scans (PNG images, typically 1-5 MB each):
- Free tier supports ~200-1000 scans/month
- Monitor usage in Vercel dashboard under **Storage** → **Blob**

## Alternative: Use Different Storage

If you prefer to use a different storage solution (AWS S3, Cloudflare R2, etc.), you would need to:
1. Update `backend/src/services/file-storage.service.ts`
2. Replace the Vercel Blob implementation with your chosen provider
3. Update environment variables accordingly

