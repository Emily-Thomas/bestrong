import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as inbodyScanService from '../../backend/src/services/inbody-scan.service';

/**
 * Debug endpoint to check InBody scan processing status
 * Access via: /api/debug/inbody-status
 * 
 * This endpoint helps diagnose why scans might be stuck in pending status
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Get pending scans
    const pendingScans = await inbodyScanService.getPendingInBodyScans();
    
    // Get a sample of recent scans (all statuses)
    const pool = (await import('../../backend/src/config/database')).default;
    const recentScansResult = await pool.query(
      `SELECT id, client_id, extraction_status, created_at, updated_at, 
              file_name, SUBSTRING(file_path, 1, 50) as file_path_preview,
              CASE 
                WHEN extraction_raw_response IS NOT NULL 
                THEN SUBSTRING(extraction_raw_response, 1, 200)
                ELSE NULL
              END as error_preview
       FROM inbody_scans 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    
    // Environment info
    const envInfo = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyPreview: process.env.OPENAI_API_KEY 
        ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` 
        : 'NOT SET',
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envInfo,
      pendingScans: {
        count: pendingScans.length,
        scans: pendingScans.map(s => ({
          id: s.id,
          client_id: s.client_id,
          created_at: s.created_at,
          file_name: s.file_name,
          age_minutes: Math.floor((Date.now() - new Date(s.created_at).getTime()) / 60000),
        })),
      },
      recentScans: {
        count: recentScansResult.rows.length,
        scans: recentScansResult.rows,
      },
      recommendations: {
        message: 'If scans are stuck in pending, check:',
        checks: [
          '1. Is OPENAI_API_KEY set in Vercel environment variables?',
          '2. Is BLOB_READ_WRITE_TOKEN set in Vercel environment variables?',
          '3. Check Vercel cron job logs for errors',
          '4. Manually trigger cron: GET /api/cron/process-jobs',
          '5. Check if files exist in Vercel Blob storage',
        ],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      stack: errorStack,
    });
  }
}
