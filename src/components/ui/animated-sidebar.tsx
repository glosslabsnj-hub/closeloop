import { cn } from "@/lib/utils";
import { Link, LinkProps } from "react-router-dom";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useAnimatedSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useAnimatedSidebar must be used within an AnimatedSidebarProvider");
  }
  return context;
};

export const AnimatedSidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const AnimatedSidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <AnimatedSidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </AnimatedSidebarProvider>
  );
};

export const SidebarBody = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar className={className} {...props}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children as React.ReactNode}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useAnimatedSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar border-r border-sidebar-border/50 flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "280px" : "60px") : "280px",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useAnimatedSidebar();
  return (
    <div className={cn("md:hidden", className)} {...props}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-[100] flex flex-col bg-sidebar p-6",
            )}
          >
            <div
              className="absolute right-4 top-4 cursor-pointer text-sidebar-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  isActive,
  isLocked,
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
  isLocked?: boolean;
  props?: LinkProps;
}) => {
  const { open, animate } = useAnimatedSidebar();
  return (
    <Link
      to={isLocked ? "/app/go-live" : link.href}
      className={cn(
        "flex items-center gap-3 group/sidebar rounded-lg px-4 py-3 h-11 transition-colors",
        isActive
          ? "bg-primary text-white font-medium"
          : "text-muted-foreground hover:bg-[hsl(217,33%,27%)]",
        isLocked && "opacity-40 pointer-events-none",
        className
      )}
      {...props}
    >
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2 }}
        className="text-sm font-medium whitespace-pre"
      >
        {link.label}
      </motion.span>
      {link.badge && link.badge > 0 && open && (
        <span className="ml-auto bg-destructive text-destructive-foreground text-[9px] font-semibold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
          {link.badge}
        </span>
      )}
    </Link>
  );
};
