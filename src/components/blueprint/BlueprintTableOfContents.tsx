import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TOCItem {
  id: string;
  label: string;
  number: number;
}

const TOC_ITEMS: TOCItem[] = [
  { id: "platform-overview", label: "Platform Overview", number: 1 },
  { id: "user-roles", label: "User Roles & Access", number: 2 },
  { id: "golden-path", label: "The Golden Path", number: 3 },
  { id: "pages-features", label: "Pages & Features", number: 4 },
  { id: "business-brain", label: "Business Brain", number: 5 },
  { id: "database-schema", label: "Database Schema", number: 6 },
  { id: "edge-functions", label: "Edge Functions", number: 7 },
  { id: "integrations", label: "Integrations & Automation", number: 8 },
  { id: "ai-voice", label: "AI & Voice", number: 9 },
  { id: "industry-support", label: "Industry Support", number: 10 },
  { id: "hooks-state", label: "Hooks & State Management", number: 11 },
  { id: "pricing", label: "Pricing & Subscriptions", number: 12 },
  { id: "security-rls", label: "Security & RLS", number: 13 },
];

export function BlueprintTableOfContents() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const item of TOC_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">
        Contents
      </p>
      {TOC_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollTo(item.id)}
          className={cn(
            "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
            activeId === item.id
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <span className="text-xs opacity-60 mr-1.5">{item.number}.</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
