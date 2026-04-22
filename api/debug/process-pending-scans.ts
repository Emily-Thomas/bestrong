import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processInBodyScan } from '../../backend/src/routes/inbody-scan.routes';
import * as inbodyScanService from '../../backend/src/services/inbody-scan.service';

export const config = {
  maxDuration: 300, // 5 minutes
};

/**
 * Manual trigger endpoint to process pending InBody scans
 * Access via: GET /api/debug/process-pending-scans
 * 
 * Use this endpoint to manually trigger processing of pending scans
 * when debugging or if the cron job isn't working
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    console.log('🔍 Manual processing of pending InBody scans triggered');
    
    // Get pending scans
    const pendingScans = await inbodyScanService.getPendingInBodyScans();
    console.log(`Found ${pendingScans.length} pending InBody scans`);
    
    if (pendingScans.length === 0) {
      return res.json({
        success: true,
        message: 'No pending scans to process',
        processed: 0,
        found: 0,
      });
    }
    
    console.log(`Pending scan IDs: ${pendingScans.map(s => s.id).join(', ')}`);
    
    const results: Array<{
      scanId: number;
      clientId: number;
      status: 'success' | 'error';
      message?: string;
      error?: string;
    }> = [];
    
    let processedCount = 0;
    
    for (const scan of pendingScans) {
      try {
        console.log(`\n🔄 Processing InBody scan ${scan.id} (client ${scan.client_id})`);
        console.log(`   File: ${scan.file_name}`);
        console.log(`   Created: ${scan.created_at}`);
        
        await processInBodyScan(scan.id);
        processedCount++;
        
        console.log(`✅ Successfully processed InBody scan ${scan.id}`);
        
        results.push({
          scanId: scan.id,
          clientId: scan.client_id,
          status: 'success',
          message: 'Processed successfully',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error(`❌ Error processing InBody scan ${scan.id}:`, errorMessage);
        if (errorStack) {
          console.error(`   Stack trace:`, errorStack);
        }
        
        results.push({
          scanId: scan.id,
          clientId: scan.client_id,
          status: 'error',
          error: errorMessage,
        });
      }
    }
    
    console.log(`\n✨ Completed: ${processedCount}/${pendingScans.length} scans processed successfully`);
    
    res.json({
      success: true,
      message: `Processed ${processedCount} of ${pendingScans.length} pending scans`,
      processed: processedCount,
      found: pendingScans.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Fatal error processing scans:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      stack: errorStack,
    });
  }
}
