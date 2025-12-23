'use client';

import { Download, Edit, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type InBodyScan,
  inbodyScansApi,
} from '@/lib/api';
import { ScanReviewModal } from './ScanReviewModal';
import { formatNumber } from './utils';

interface ScanDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: InBodyScan;
  onUpdate: () => void;
}

export function ScanDetailsModal({
  open,
  onOpenChange,
  scan,
  onUpdate,
}: ScanDetailsModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const response = await inbodyScansApi.delete(scan.id);
      if (response.success) {
        onUpdate();
        onOpenChange(false);
      } else {
        setError(response.error || 'Failed to delete scan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scan');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownload = () => {
    window.open(inbodyScansApi.download(scan.id), '_blank');
  };

  const handleReviewComplete = () => {
    onUpdate();
    setReviewModalOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>InBody Scan Details</DialogTitle>
            <DialogDescription>
              View complete scan information and extracted data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {scan.verified ? (
                  <Badge variant="default">Verified</Badge>
                ) : (
                  <Badge variant="outline">
                    {scan.extraction_status === 'pending'
                      ? 'Processing...'
                      : scan.extraction_status === 'completed'
                        ? 'Needs Review'
                        : scan.extraction_status === 'failed'
                          ? 'Extraction Failed'
                          : scan.extraction_status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!scan.verified && scan.extraction_status === 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewModalOpen(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Review & Verify
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm mb-3">File Information</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">File Name</dt>
                    <dd className="font-medium">{scan.file_name}</dd>
                  </div>
                  {scan.file_size_bytes && (
                    <div>
                      <dt className="text-muted-foreground">File Size</dt>
                      <dd className="font-medium">
                        {(scan.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Uploaded</dt>
                    <dd className="font-medium">
                      {new Date(scan.created_at).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Scan Information</h4>
                <dl className="space-y-2 text-sm">
                  {scan.scan_date && (
                    <div>
                      <dt className="text-muted-foreground">Scan Date</dt>
                      <dd className="font-medium">
                        {new Date(scan.scan_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {scan.verified_at && (
                    <div>
                      <dt className="text-muted-foreground">Verified At</dt>
                      <dd className="font-medium">
                        {new Date(scan.verified_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Body Composition</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const weight = formatNumber(scan.weight_lbs);
                  return weight ? (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">Weight</div>
                      <div className="text-lg font-semibold">
                        {weight} lbs
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const smm = formatNumber(scan.smm_lbs);
                  return smm ? (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        Skeletal Muscle Mass
                      </div>
                      <div className="text-lg font-semibold">
                        {smm} lbs
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const bodyFatMass = formatNumber(scan.body_fat_mass_lbs);
                  return bodyFatMass ? (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        Body Fat Mass
                      </div>
                      <div className="text-lg font-semibold">
                        {bodyFatMass} lbs
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const bmi = formatNumber(scan.bmi);
                  return bmi ? (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">BMI</div>
                      <div className="text-lg font-semibold">
                        {bmi}
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const percentBodyFat = formatNumber(scan.percent_body_fat);
                  return percentBodyFat ? (
                    <div className="border rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">
                        Body Fat %
                      </div>
                      <div className="text-lg font-semibold">
                        {percentBodyFat}%
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {scan.segment_analysis && (
              <div>
                <h4 className="font-medium text-sm mb-3">Segment Analysis</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(scan.segment_analysis).map(([segment, data]) => (
                    <div key={segment} className="border rounded-lg p-3">
                      <h5 className="font-medium text-sm mb-2 capitalize">
                        {segment.replace('_', ' ')}
                      </h5>
                      {data && typeof data === 'object' && (
                        <div className="space-y-1 text-sm">
                          {(() => {
                            const muscleMass = formatNumber(data.muscle_mass_lbs);
                            return muscleMass ? (
                              <div>
                                <span className="text-muted-foreground">Muscle:</span>{' '}
                                <span className="font-medium">
                                  {muscleMass} lbs
                                </span>
                              </div>
                            ) : null;
                          })()}
                          {(() => {
                            const fatMass = formatNumber(data.fat_mass_lbs);
                            return fatMass ? (
                              <div>
                                <span className="text-muted-foreground">Fat:</span>{' '}
                                <span className="font-medium">
                                  {fatMass} lbs
                                </span>
                              </div>
                            ) : null;
                          })()}
                          {(() => {
                            const percentFat = formatNumber(data.percent_fat);
                            return percentFat ? (
                              <div>
                                <span className="text-muted-foreground">% Fat:</span>{' '}
                                <span className="font-medium">
                                  {percentFat}%
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete InBody Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this InBody scan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reviewModalOpen && (
        <ScanReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          scan={scan}
          onComplete={handleReviewComplete}
        />
      )}
    </>
  );
}

