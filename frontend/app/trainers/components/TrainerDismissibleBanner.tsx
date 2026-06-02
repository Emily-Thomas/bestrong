'use client';

import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TrainerDismissibleBannerProps = {
  message: string;
  onDismiss: () => void;
  variant?: 'default' | 'success';
  className?: string;
};

export function TrainerDismissibleBanner({
  message,
  onDismiss,
  variant = 'default',
  className,
}: TrainerDismissibleBannerProps) {
  return (
    <Alert
      className={cn(
        variant === 'success'
          ? 'border-emerald-500/25 bg-emerald-500/5'
          : 'border-primary/25 bg-primary/5',
        className
      )}
    >
      <div className="flex gap-3">
        <AlertDescription className="flex-1">{message}</AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </Alert>
  );
}
