import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

interface ResumeOnboardingModalProps {
  open: boolean;
  savedAt?: string;
  onResume: () => void;
  onStartFresh: () => void;
}

export function ResumeOnboardingModal({ open, savedAt, onResume, onStartFresh }: ResumeOnboardingModalProps) {
  const timeAgo = savedAt
    ? formatDistanceToNow(new Date(savedAt), { addSuffix: true })
    : "recently";

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resume where you left off?</AlertDialogTitle>
          <AlertDialogDescription>
            You have saved onboarding progress from {timeAgo}. Would you like to continue
            from where you stopped, or start fresh?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStartFresh}>Start Fresh</AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>Resume</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
