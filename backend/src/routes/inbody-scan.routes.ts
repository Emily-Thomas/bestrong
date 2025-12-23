import { type Request, type Response, Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import * as inbodyScanService from '../services/inbody-scan.service';
import * as inbodyExtractionService from '../services/inbody-extraction.service';
import * as fileStorageService from '../services/file-storage.service';
import type { UpdateInBodyScanInput } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only accept PNG image files
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG image files are allowed'));
    }
  },
});

// Upload InBody scan
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const { client_id } = req.body;
      const clientId = parseInt(client_id, 10);

      if (Number.isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid client ID',
        });
        return;
      }

      // Upload file using storage service (handles local dev vs production)
      const filePath = `inbody-scans/${clientId}/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await fileStorageService.uploadFile(filePath, req.file.buffer, {
        access: 'public',
        contentType: 'image/png',
      });

      // Create database record
      const scan = await inbodyScanService.createInBodyScan(
        {
          client_id: clientId,
          file_path: fileUrl,
          file_name: req.file.originalname,
          file_size_bytes: req.file.size,
          mime_type: req.file.mimetype,
        },
        req.user.userId
      );

      // Start extraction in background (don't await)
      extractInBodyDataAsync(scan.id, req.file.buffer).catch((error) => {
        console.error(`Error extracting data for scan ${scan.id}:`, error);
      });

      res.status(201).json({
        success: true,
        data: {
          scan_id: scan.id,
          extraction_status: 'pending',
        },
        message: 'File uploaded successfully. Extracting data...',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Async function to extract data
async function extractInBodyDataAsync(scanId: number, pdfBuffer: Buffer): Promise<void> {
  try {
    const extractedData = await inbodyExtractionService.extractInBodyData(pdfBuffer);

    await inbodyScanService.updateExtractionResult(scanId, {
      extraction_status: 'completed',
      ...extractedData,
    });
  } catch (error) {
    console.error(`Extraction failed for scan ${scanId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await inbodyScanService.updateExtractionResult(scanId, {
      extraction_status: 'failed',
      extraction_raw_response: errorMessage,
    });
  }
}

// Get extraction status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid scan ID' });
      return;
    }

    const scan = await inbodyScanService.getInBodyScanById(id);

    if (!scan) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        extraction_status: scan.extraction_status,
        scan: scan.extraction_status === 'completed' || scan.extraction_status === 'verified' ? scan : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get scan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid scan ID' });
      return;
    }

    const scan = await inbodyScanService.getInBodyScanById(id);

    if (!scan) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    res.json({ success: true, data: scan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get all scans for a client
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const scans = await inbodyScanService.getInBodyScansByClientId(clientId);

    res.json({ success: true, data: scans });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get latest scan for a client
router.get('/client/:clientId/latest', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const scan = await inbodyScanService.getLatestInBodyScanByClientId(clientId);

    if (!scan) {
      res.status(404).json({ success: false, error: 'No scan found for this client' });
      return;
    }

    res.json({ success: true, data: scan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Check if client has scan
router.get('/client/:clientId/has-scan', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const hasScan = await inbodyScanService.hasInBodyScan(clientId);
    const latestScan = hasScan
      ? await inbodyScanService.getLatestInBodyScanByClientId(clientId)
      : null;

    res.json({
      success: true,
      data: {
        has_scan: hasScan,
        scan_count: hasScan ? (await inbodyScanService.getInBodyScansByClientId(clientId)).length : 0,
        latest_scan_id: latestScan?.id || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update/verify scan data
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid scan ID' });
      return;
    }

    const input: UpdateInBodyScanInput = req.body;

    // Note: verified_by is handled in the service layer when verified is set to true
    const scan = await inbodyScanService.updateInBodyScan(id, input, req.user.userId);

    if (!scan) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    res.json({
      success: true,
      data: scan,
      message: 'Scan updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Download image (serve file or redirect to blob URL)
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid scan ID' });
      return;
    }

    const scan = await inbodyScanService.getInBodyScanById(id);

    if (!scan) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    // Check if it's a local file path (starts with /api/files/)
    if (scan.file_path.startsWith('/api/files/')) {
      // Serve file directly for local development
      try {
        const fileBuffer = await fileStorageService.readFileFromStorage(scan.file_path);
        res.setHeader('Content-Type', scan.mime_type || 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${scan.file_name}"`);
        res.send(fileBuffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: `Failed to read file: ${message}` });
      }
    } else {
      // Redirect to the blob URL (production)
      res.redirect(scan.file_path);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Delete scan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid scan ID' });
      return;
    }

    // Get scan before deleting to access file_path
    const scan = await inbodyScanService.getInBodyScanById(id);
    
    // Delete file from storage
    if (scan) {
      try {
        await fileStorageService.deleteFile(scan.file_path);
      } catch (error) {
        console.error(`Failed to delete file ${scan.file_path}:`, error);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete database record
    const deleted = await inbodyScanService.deleteInBodyScan(id);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

