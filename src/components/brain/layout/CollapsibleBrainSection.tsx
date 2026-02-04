/**
 * CollapsibleBrainSection - Compact accordion-style section for Business Brain
 * 
 * Shows a collapsed preview by default with:
 * - Icon + Title
 * - 1-line preview of content
 * - Expand/collapse on click
 * - State persisted to localStorage
 */

import { useState, useEffect, ReactNode, useCallback } from "react";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "brain-sections-expanded";

// Get expanded sections from localStorage
function getExpandedSections(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

// Save expanded sections to localStorage
function saveExpandedSections(sections: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sections]));
  } catch {
    // Ignore storage errors
  }
}

interface CollapsibleBrainSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  preview: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleBrainSection({
  id,
  title,
  icon: Icon,
  preview,
  children,
  defaultExpanded = false,
  className,
}: CollapsibleBrainSectionProps) {
  // Initialize from localStorage - default is COLLAPSED unless explicitly set
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = getExpandedSections();
    // Only expand if explicitly saved as expanded OR defaultExpanded is true
    if (defaultExpanded && !localStorage.getItem(STORAGE_KEY)) {
      return true; // First load with defaultExpanded
    }
    return stored.has(id);
  });

  // Persist state changes to localStorage
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const newValue = !prev;
      const sections = getExpandedSections();
      if (newValue) {
        sections.add(id);
      } else {
        sections.delete(id);
      }
      saveExpandedSections(sections);
      return newValue;
    });
  }, [id]);

  // Sync with URL hash for deep linking (e.g., #required-questions)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === id && !isExpanded) {
      setIsExpanded(true);
      const sections = getExpandedSections();
      sections.add(id);
      saveExpandedSections(sections);
      
      // Scroll into view after a brief delay
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [id, isExpanded]);

  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border bg-card transition-all duration-200",
        isExpanded && "ring-1 ring-primary/20",
        className
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>
        
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Content - shown when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
