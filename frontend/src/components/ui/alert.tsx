import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm text-foreground [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'border-border bg-card',
        destructive:
          'border-destructive/50 bg-destructive/5 text-destructive dark:bg-destructive/10 [&>svg]:text-destructive',
        success:
          'border-success/45 bg-success/5 dark:border-success/35 dark:bg-success/10 [&>svg]:text-success',
        info: 'border-info/45 bg-info/5 dark:border-info/35 dark:bg-info/10 [&>svg]:text-info',
        warning:
          'border-warning/50 bg-warning/10 dark:border-warning/40 dark:bg-warning/15 [&>svg]:text-warning',
        /** Primary (signal) — in-progress, highlights tied to the main CTA */
        signal:
          'border-primary/50 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 [&>svg]:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
