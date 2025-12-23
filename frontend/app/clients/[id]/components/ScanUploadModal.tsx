'use client';

import { Upload, X, Loader2, FileImage } from 'lucide-react';
import { useCallback, useState } from 'react';
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
import { inbodyScansApi } from '@/lib/api';

interface ScanUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess: (scanId: number) => void;
}

export function ScanUploadModal({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: ScanUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (fileToValidate: File) => {
    setError('');

    // Check file type
    if (fileToValidate.type !== 'image/png') {
      setError('Only PNG image files are allowed');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileToValidate.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(fileToValidate);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const response = await inbodyScansApi.upload(clientId, file);
      if (response.success && response.data) {
        onSuccess(response.data.scan_id);
        setFile(null);
        onOpenChange(false);
      } else {
        setError(response.error || 'Failed to upload scan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload scan');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload InBody Scan</DialogTitle>
          <DialogDescription>
            Upload a PNG image of the InBody scan. The system will automatically extract the data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${file ? 'border-primary bg-primary/5' : ''}
            `}
          >
            {file ? (
              <div className="space-y-4">
                <FileImage className="mx-auto h-12 w-12 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drag and drop your PNG file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={uploading}
                  >
                    <span>Select File</span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground">
                  PNG files only, max 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

