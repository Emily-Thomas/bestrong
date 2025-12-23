'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type InBodyScan,
  type UpdateInBodyScanInput,
  inbodyScansApi,
} from '@/lib/api';
import { formatNumber } from './utils';

interface ScanReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scan: InBodyScan;
  onComplete: () => void;
}

export function ScanReviewModal({
  open,
  onOpenChange,
  scan,
  onComplete,
}: ScanReviewModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<UpdateInBodyScanInput>({
    scan_date: scan.scan_date || '',
    weight_lbs: scan.weight_lbs || undefined,
    smm_lbs: scan.smm_lbs || undefined,
    body_fat_mass_lbs: scan.body_fat_mass_lbs || undefined,
    bmi: scan.bmi || undefined,
    percent_body_fat: scan.percent_body_fat || undefined,
    verified: true,
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await inbodyScansApi.update(scan.id, formData);
      if (response.success) {
        onComplete();
        onOpenChange(false);
      } else {
        setError(response.error || 'Failed to save scan data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scan data');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateInBodyScanInput, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? undefined : value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Extracted Data</DialogTitle>
          <DialogDescription>
            Please review and verify the extracted data from the InBody scan. You can edit any values if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scan_date">Scan Date</Label>
              <Input
                id="scan_date"
                type="date"
                value={formData.scan_date || ''}
                onChange={(e) => handleChange('scan_date', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_lbs">Weight (lbs)</Label>
              <Input
                id="weight_lbs"
                type="number"
                step="0.1"
                value={formData.weight_lbs || ''}
                onChange={(e) =>
                  handleChange('weight_lbs', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smm_lbs">SMM - Skeletal Muscle Mass (lbs)</Label>
              <Input
                id="smm_lbs"
                type="number"
                step="0.1"
                value={formData.smm_lbs || ''}
                onChange={(e) =>
                  handleChange('smm_lbs', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_fat_mass_lbs">Body Fat Mass (lbs)</Label>
              <Input
                id="body_fat_mass_lbs"
                type="number"
                step="0.1"
                value={formData.body_fat_mass_lbs || ''}
                onChange={(e) =>
                  handleChange(
                    'body_fat_mass_lbs',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bmi">BMI</Label>
              <Input
                id="bmi"
                type="number"
                step="0.1"
                value={formData.bmi || ''}
                onChange={(e) =>
                  handleChange('bmi', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="percent_body_fat">Percent Body Fat (%)</Label>
              <Input
                id="percent_body_fat"
                type="number"
                step="0.1"
                value={formData.percent_body_fat || ''}
                onChange={(e) =>
                  handleChange(
                    'percent_body_fat',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                disabled={saving}
              />
            </div>
          </div>

          {scan.segment_analysis && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Segment Analysis</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(scan.segment_analysis).map(([segment, data]) => (
                  <div key={segment} className="border rounded-lg p-3 space-y-2">
                    <h5 className="font-medium text-sm capitalize">
                      {segment.replace('_', ' ')}
                    </h5>
                    {data && typeof data === 'object' && (
                      <div className="space-y-1 text-sm">
                        {(() => {
                          const muscleMass = formatNumber(data.muscle_mass_lbs);
                          return muscleMass ? (
                            <div>
                              <span className="text-muted-foreground">Muscle:</span>{' '}
                              {muscleMass} lbs
                            </div>
                          ) : null;
                        })()}
                        {(() => {
                          const fatMass = formatNumber(data.fat_mass_lbs);
                          return fatMass ? (
                            <div>
                              <span className="text-muted-foreground">Fat:</span>{' '}
                              {fatMass} lbs
                            </div>
                          ) : null;
                        })()}
                        {(() => {
                          const percentFat = formatNumber(data.percent_fat);
                          return percentFat ? (
                            <div>
                              <span className="text-muted-foreground">% Fat:</span>{' '}
                              {percentFat}%
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Verify & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

