import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

/**
 * Determines if we're in a local development environment
 */
function isLocalDevelopment(): boolean {
  // Check if we're in Vercel environment
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return false;
  }
  
  // Check if BLOB_READ_WRITE_TOKEN is set (indicates production/staging)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return false;
  }
  
  // Default to local development
  return true;
}

/**
 * Gets the local storage directory for files
 */
function getLocalStorageDir(): string {
  const storageDir = process.env.LOCAL_FILE_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'inbody-scans');
  return storageDir;
}

/**
 * Uploads a file to storage (local or Vercel Blob)
 * @param filePath - The path/key for the file (e.g., "inbody-scans/123/scan.png")
 * @param buffer - The file buffer
 * @param options - Upload options
 * @returns The URL or path to access the file
 */
export async function uploadFile(
  filePath: string,
  buffer: Buffer,
  options: {
    contentType?: string;
    access?: 'public' | 'private';
  } = {}
): Promise<string> {
  if (isLocalDevelopment()) {
    // Local development: save to local file system
    const storageDir = getLocalStorageDir();
    const fullPath = path.join(storageDir, filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await mkdir(dir, { recursive: true });
    
    // Write file
    await writeFile(fullPath, buffer);
    
    // Return a path that can be used to serve the file
    // In local dev, we'll serve files via a static route
    return `/api/files/${filePath}`;
  } else {
    // Production: use Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN is required for file uploads in production. ' +
        'Please set this environment variable in your Vercel project settings.'
      );
    }
    
    // Dynamic import to avoid loading @vercel/blob in local dev
    const { put } = await import('@vercel/blob');
    const blob = await put(filePath, buffer, {
      access: (options.access || 'public') as 'public',
      contentType: options.contentType || 'application/octet-stream',
    });
    
    return blob.url;
  }
}

/**
 * Reads a file from storage (local or Vercel Blob)
 * @param filePathOrUrl - The file path (local) or URL (Vercel Blob)
 * @returns The file buffer
 */
export async function readFileFromStorage(filePathOrUrl: string): Promise<Buffer> {
  if (isLocalDevelopment()) {
    // Local development: read from local file system
    // Remove /api/files prefix if present (from uploadFile return value)
    const localPath = filePathOrUrl.startsWith('/api/files/')
      ? filePathOrUrl.replace('/api/files/', '')
      : filePathOrUrl;
    
    const storageDir = getLocalStorageDir();
    const fullPath = path.join(storageDir, localPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    
    return await readFile(fullPath);
  } else {
    // Production: fetch from Vercel Blob URL
    const response = await fetch(filePathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from blob storage: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Deletes a file from storage (local or Vercel Blob)
 * @param filePathOrUrl - The file path (local) or URL (Vercel Blob)
 */
export async function deleteFile(filePathOrUrl: string): Promise<void> {
  if (isLocalDevelopment()) {
    // Local development: delete from local file system
    const localPath = filePathOrUrl.startsWith('/api/files/')
      ? filePathOrUrl.replace('/api/files/', '')
      : filePathOrUrl;
    
    const storageDir = getLocalStorageDir();
    const fullPath = path.join(storageDir, localPath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } else {
    // Production: Vercel Blob doesn't have a delete method in @vercel/blob
    // Files are typically managed through Vercel dashboard or API
    // For now, we'll just log that deletion was requested
    console.log(`File deletion requested for: ${filePathOrUrl} (Vercel Blob - manual deletion may be required)`);
  }
}

/**
 * Checks if a file exists in storage
 * @param filePathOrUrl - The file path (local) or URL (Vercel Blob)
 * @returns True if file exists
 */
export async function fileExists(filePathOrUrl: string): Promise<boolean> {
  if (isLocalDevelopment()) {
    const localPath = filePathOrUrl.startsWith('/api/files/')
      ? filePathOrUrl.replace('/api/files/', '')
      : filePathOrUrl;
    
    const storageDir = getLocalStorageDir();
    const fullPath = path.join(storageDir, localPath);
    
    return fs.existsSync(fullPath);
  } else {
    // Production: check if URL is accessible
    try {
      const response = await fetch(filePathOrUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

