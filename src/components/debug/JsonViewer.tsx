import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JsonViewerProps {
  data: unknown;
  title?: string;
  maxHeight?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showCopy?: boolean;
  showDownload?: boolean;
  downloadFilename?: string;
}

export function JsonViewer({
  data,
  title,
  maxHeight = "400px",
  collapsible = true,
  defaultCollapsed = false,
  showCopy = true,
  showDownload = false,
  downloadFilename = "data.json",
}: JsonViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);
  const lineCount = jsonString.split("\n").length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: downloadFilename });
  };

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
          {title && <span className="text-sm font-medium">{title}</span>}
          <Badge variant="secondary" className="text-xs">
            {lineCount} lines
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {showDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          )}
          {showCopy && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <ScrollArea style={{ maxHeight }} className="p-3">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </ScrollArea>
      )}
    </div>
  );
}
