/**
 * BrainBuilderDrawer - Wraps the Brain Builder chat in a drawer (mobile) or dialog (desktop).
 */

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BrainBuilderChat } from "./BrainBuilderChat";

interface BrainBuilderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrainBuilderDrawer({ open, onOpenChange }: BrainBuilderDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <DrawerTitle className="text-base">AI Brain Builder</DrawerTitle>
            </div>
            <DrawerDescription className="text-xs">
              Answer questions to set up your AI receptionist
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <BrainBuilderChat />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DialogTitle className="text-base">AI Brain Builder</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Answer questions to set up your AI receptionist
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <BrainBuilderChat />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BrainBuilderTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Set up with AI
      </Button>
      <BrainBuilderDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
