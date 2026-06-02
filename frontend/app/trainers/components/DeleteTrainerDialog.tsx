'use client';

import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { trainerDisplayName } from '../lib/trainer-utils';

type DeleteTrainerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  lastName: string;
  deleting: boolean;
  onConfirm: () => void;
};

export function DeleteTrainerDialog({
  open,
  onOpenChange,
  firstName,
  lastName,
  deleting,
  onConfirm,
}: DeleteTrainerDialogProps) {
  const name = trainerDisplayName({ first_name: firstName, last_name: lastName });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Their coaching profile and structured persona will be deleted. Programs
            already built are not changed, but you will need another coach with a
            ready persona for new AI plans.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Removing…
              </>
            ) : (
              'Remove trainer'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
