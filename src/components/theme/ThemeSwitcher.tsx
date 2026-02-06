import { useState, useEffect } from "react";
import { Check, ChevronDown, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ThemeId = 
  | "purple-dark" 
  | "purple-light" 
  | "ocean-dark" 
  | "ocean-light"
  | "emerald-dark"
  | "emerald-light"
  | "amber-dark"
  | "rose-dark"
  | "slate-dark"
  | "midnight-blue";

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    accent: string;
    text: string;
  };
}

const themes: ThemeOption[] = [
  {
    id: "purple-dark",
    name: "Purple Dark",
    description: "Default premium theme",
    preview: { bg: "#0a0a0f", accent: "#a855f7", text: "#fafafa" },
  },
  {
    id: "purple-light",
    name: "Purple Light",
    description: "Light mode purple",
    preview: { bg: "#fafafa", accent: "#9333ea", text: "#1a1a2e" },
  },
  {
    id: "ocean-dark",
    name: "Ocean Dark",
    description: "Deep blue tones",
    preview: { bg: "#0a0f14", accent: "#0ea5e9", text: "#f0f9ff" },
  },
  {
    id: "ocean-light",
    name: "Ocean Light",
    description: "Fresh coastal vibes",
    preview: { bg: "#f0f9ff", accent: "#0284c7", text: "#0c4a6e" },
  },
  {
    id: "emerald-dark",
    name: "Emerald Dark",
    description: "Rich green accents",
    preview: { bg: "#0a0f0d", accent: "#10b981", text: "#ecfdf5" },
  },
  {
    id: "emerald-light",
    name: "Emerald Light",
    description: "Fresh green theme",
    preview: { bg: "#ecfdf5", accent: "#059669", text: "#064e3b" },
  },
  {
    id: "amber-dark",
    name: "Amber Dark",
    description: "Warm golden tones",
    preview: { bg: "#0f0d0a", accent: "#f59e0b", text: "#fffbeb" },
  },
  {
    id: "rose-dark",
    name: "Rose Dark",
    description: "Elegant pink accents",
    preview: { bg: "#0f0a0c", accent: "#f43f5e", text: "#fff1f2" },
  },
  {
    id: "slate-dark",
    name: "Slate Minimal",
    description: "Neutral & clean",
    preview: { bg: "#0f0f12", accent: "#64748b", text: "#f8fafc" },
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    description: "Deep navy elegance",
    preview: { bg: "#020617", accent: "#3b82f6", text: "#e0f2fe" },
  },
];

const THEME_STORAGE_KEY = "closeloop-theme";
const LAST_THEME_STORAGE_KEY = "closeloop-last-theme";

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("purple-dark");
  const [lastTheme, setLastTheme] = useState<ThemeId | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const storedLast = localStorage.getItem(LAST_THEME_STORAGE_KEY) as ThemeId | null;
    
    if (stored && themes.find(t => t.id === stored)) {
      setCurrentTheme(stored);
      applyTheme(stored);
    }
    if (storedLast) {
      setLastTheme(storedLast);
    }
  }, []);

  const applyTheme = (themeId: ThemeId) => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      "dark", "light",
      "theme-purple-dark", "theme-purple-light",
      "theme-ocean-dark", "theme-ocean-light",
      "theme-emerald-dark", "theme-emerald-light",
      "theme-amber-dark", "theme-rose-dark",
      "theme-slate-dark", "theme-midnight-blue"
    );

    // Add new theme class
    document.documentElement.classList.add(`theme-${themeId}`);
    
    // Set light/dark mode
    if (themeId.includes("light")) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  const switchTheme = (themeId: ThemeId) => {
    if (themeId === currentTheme) return;
    
    // Store current as last
    setLastTheme(currentTheme);
    localStorage.setItem(LAST_THEME_STORAGE_KEY, currentTheme);
    
    // Apply new theme
    setCurrentTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    applyTheme(themeId);
  };

  const switchToLastTheme = () => {
    if (lastTheme) {
      switchTheme(lastTheme);
    }
  };

  return { currentTheme, lastTheme, switchTheme, switchToLastTheme, themes };
}

export function ThemeSwitcher() {
  const { currentTheme, lastTheme, switchTheme, switchToLastTheme, themes } = useTheme();
  
  const currentThemeData = themes.find(t => t.id === currentTheme);
  const lastThemeData = lastTheme ? themes.find(t => t.id === lastTheme) : null;

  return (
    <div className="flex items-center gap-1">
      {/* Quick switch to last theme */}
      {lastThemeData && lastTheme !== currentTheme && (
        <Button
          variant="ghost"
          size="sm"
          onClick={switchToLastTheme}
          className="h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          title={`Switch back to ${lastThemeData.name}`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{lastThemeData.name}</span>
        </Button>
      )}

      {/* Theme dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5"
          >
            <div 
              className="h-4 w-4 rounded-full border border-border/50"
              style={{ backgroundColor: currentThemeData?.preview.accent }}
            />
            <span className="hidden sm:inline text-xs">{currentThemeData?.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Choose Theme
          </div>
          <DropdownMenuSeparator className="bg-border/50" />
          
          {/* Dark themes */}
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Dark Themes
          </div>
          {themes.filter(t => !t.id.includes("light")).map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => switchTheme(theme.id)}
              className="cursor-pointer flex items-center gap-3 py-2"
            >
              <div 
                className="h-6 w-6 rounded-md border border-border/50 flex items-center justify-center"
                style={{ backgroundColor: theme.preview.bg }}
              >
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{theme.name}</div>
                <div className="text-xs text-muted-foreground truncate">{theme.description}</div>
              </div>
              {currentTheme === theme.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-border/50" />
          
          {/* Light themes */}
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Light Themes
          </div>
          {themes.filter(t => t.id.includes("light")).map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => switchTheme(theme.id)}
              className="cursor-pointer flex items-center gap-3 py-2"
            >
              <div 
                className="h-6 w-6 rounded-md border border-border/50 flex items-center justify-center"
                style={{ backgroundColor: theme.preview.bg }}
              >
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{theme.name}</div>
                <div className="text-xs text-muted-foreground truncate">{theme.description}</div>
              </div>
              {currentTheme === theme.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
