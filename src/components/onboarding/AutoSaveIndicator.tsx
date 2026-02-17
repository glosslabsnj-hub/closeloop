import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved";
}

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        {status === "saving" ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            <span>Saved</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
