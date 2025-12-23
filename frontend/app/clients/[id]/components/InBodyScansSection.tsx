'use client';

import { Download, FileImage, Loader2, Plus, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type InBodyScan,
  inbodyScansApi,
} from '@/lib/api';
import { ScanDetailsModal } from './ScanDetailsModal';
import { ScanReviewModal } from './ScanReviewModal';
import { ScanUploadModal } from './ScanUploadModal';
import { formatNumber } from './utils';

interface InBodyScansSectionProps {
  clientId: number;
}

export function InBodyScansSection({ clientId }: InBodyScansSectionProps) {
  const [scans, setScans] = useState<InBodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<InBodyScan | null>(null);
  const [pollingScans, setPollingScans] = useState<Set<number>>(new Set());

  const loadScans = useCallback(async () => {
    try {
      setError('');
      const response = await inbodyScansApi.getByClientId(clientId);
      if (response.success && response.data) {
        setScans(response.data);
      } else {
        setError(response.error || 'Failed to load scans');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scans');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  // Poll for extraction status updates
  useEffect(() => {
    if (pollingScans.size === 0) return;

    const interval = setInterval(async () => {
      for (const scanId of pollingScans) {
        try {
          const response = await inbodyScansApi.getStatus(scanId);
          if (response.success && response.data) {
            const { extraction_status, scan } = response.data;
            
            if (extraction_status === 'completed' && scan) {
              // Update the scan in the list
              setScans((prev) =>
                prev.map((s) => (s.id === scanId ? scan : s))
              );
              // Remove from polling set
              setPollingScans((prev) => {
                const next = new Set(prev);
                next.delete(scanId);
                return next;
              });
              
              // Open review modal if this is a new extraction
              if (scan.extraction_status === 'completed' && !scan.verified) {
                setSelectedScan(scan);
                setReviewModalOpen(true);
              }
            } else if (extraction_status === 'failed') {
              // Stop polling on failure
              setPollingScans((prev) => {
                const next = new Set(prev);
                next.delete(scanId);
                return next;
              });
              // Update scan to show failed status
              setScans((prev) =>
                prev.map((s) =>
                  s.id === scanId
                    ? { ...s, extraction_status: 'failed' as const }
                    : s
                )
              );
            }
          }
        } catch (err) {
          console.error(`Error polling scan ${scanId}:`, err);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [pollingScans]);

  const handleUploadSuccess = (scanId: number) => {
    // Reload scans to get the new one
    loadScans();
    // Start polling for this scan
    setPollingScans((prev) => new Set(prev).add(scanId));
  };

  const handleReviewComplete = () => {
    loadScans();
    setReviewModalOpen(false);
    setSelectedScan(null);
  };

  const handleViewDetails = (scan: InBodyScan) => {
    setSelectedScan(scan);
    setDetailsModalOpen(true);
  };

  const handleDownload = (scan: InBodyScan) => {
    window.open(inbodyScansApi.download(scan.id), '_blank');
  };

  const getStatusBadge = (scan: InBodyScan) => {
    if (scan.verified) {
      return <Badge variant="default">Verified</Badge>;
    }
    switch (scan.extraction_status) {
      case 'pending':
        return <Badge variant="secondary">Processing...</Badge>;
      case 'completed':
        return <Badge variant="outline">Needs Review</Badge>;
      case 'failed':
        return <Badge variant="destructive">Extraction Failed</Badge>;
      default:
        return <Badge variant="secondary">{scan.extraction_status}</Badge>;
    }
  };

  const isLatest = (scan: InBodyScan) => {
    if (scans.length === 0) return false;
    const sorted = [...scans].sort((a, b) => {
      const dateA = a.scan_date ? new Date(a.scan_date).getTime() : 0;
      const dateB = b.scan_date ? new Date(b.scan_date).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted[0].id === scan.id;
  };

  const isFirst = (scan: InBodyScan) => {
    if (scans.length === 0) return false;
    const sorted = [...scans].sort((a, b) => {
      const dateA = a.scan_date ? new Date(a.scan_date).getTime() : 0;
      const dateB = b.scan_date ? new Date(b.scan_date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return sorted[0].id === scan.id;
  };

  return (
    <>
      <Card id="inbody-scans-section">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>InBody Scans</CardTitle>
            <CardDescription>Body composition analysis</CardDescription>
          </div>
          <Button size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Scan
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : scans.length === 0 ? (
            <div className="text-center py-8">
              <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No InBody scans uploaded yet.
              </p>
              <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Upload First Scan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(scan)}
                      {isLatest(scan) && (
                        <Badge variant="outline" className="text-xs">
                          Latest
                        </Badge>
                      )}
                      {isFirst(scan) && (
                        <Badge variant="outline" className="text-xs">
                          First
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-4">
                        {scan.scan_date && (
                          <span>
                            <span className="font-medium">Date:</span>{' '}
                            {new Date(scan.scan_date).toLocaleDateString()}
                          </span>
                        )}
                        {scan.weight_lbs && (() => {
                          const weight = formatNumber(scan.weight_lbs);
                          return weight ? (
                            <span>
                              <span className="font-medium">Weight:</span>{' '}
                              {weight} lbs
                            </span>
                          ) : null;
                        })()}
                        {scan.percent_body_fat && (() => {
                          const bodyFat = formatNumber(scan.percent_body_fat);
                          return bodyFat ? (
                            <span>
                              <span className="font-medium">Body Fat:</span>{' '}
                              {bodyFat}%
                            </span>
                          ) : null;
                        })()}
                        {scan.bmi && (() => {
                          const bmi = formatNumber(scan.bmi);
                          return bmi ? (
                            <span>
                              <span className="font-medium">BMI:</span>{' '}
                              {bmi}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Uploaded:{' '}
                        {new Date(scan.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {scan.extraction_status === 'completed' && !scan.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedScan(scan);
                          setReviewModalOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(scan)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(scan)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ScanUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        clientId={clientId}
        onSuccess={handleUploadSuccess}
      />

      {selectedScan && (
        <>
          <ScanReviewModal
            open={reviewModalOpen}
            onOpenChange={setReviewModalOpen}
            scan={selectedScan}
            onComplete={handleReviewComplete}
          />
          <ScanDetailsModal
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            scan={selectedScan}
            onUpdate={loadScans}
          />
        </>
      )}
    </>
  );
}

