import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Copy, Check, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import {
  getVariablesByCategory,
  CATEGORY_LABELS,
  type VariableInfo,
  type VariableCategory,
} from "@/data/workflowGuides";

interface VariableGuideProps {
  mode?: BusinessMode;
  onSelectVariable?: (variable: string) => void;
  compact?: boolean;
}

export function VariableGuide({ mode, onSelectVariable, compact = false }: VariableGuideProps) {
  const { businessMode } = useTenantConfig();
  const activeMode = mode || businessMode;
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const groupedVariables = getVariablesByCategory(activeMode);

  // Filter variables by search
  const filteredGroups = Object.entries(groupedVariables).reduce((acc, [category, variables]) => {
    const filtered = variables.filter(
      (v) =>
        v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category as VariableCategory] = filtered;
    }
    return acc;
  }, {} as Record<VariableCategory, VariableInfo[]>);

  const handleCopy = (key: string) => {
    const variableText = `{{${key}}}`;
    navigator.clipboard.writeText(variableText);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: "Copied!", description: `${variableText} copied to clipboard` });
  };

  const handleSelect = (key: string) => {
    if (onSelectVariable) {
      onSelectVariable(key);
    } else {
      handleCopy(key);
    }
  };

  // Compact mode for embedding in message editor
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-4">
            {Object.entries(filteredGroups).map(([category, variables]) => {
              const categoryInfo = CATEGORY_LABELS[category as VariableCategory];
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{categoryInfo.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {categoryInfo.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {variables.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => handleSelect(v.key)}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-mono text-primary">
                            {`{{${v.key}}}`}
                          </code>
                          {copiedKey === v.key ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.description} → "{v.example}"
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.keys(filteredGroups).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No variables found matching "{searchQuery}"
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Full mode for help center
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Message Variables
        </CardTitle>
        <CardDescription>
          Use these placeholders to personalize your messages. They'll be replaced with real values when the message is sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Variable Groups */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs"
            >
              All
            </TabsTrigger>
            {Object.entries(filteredGroups).map(([category]) => {
              const categoryInfo = CATEGORY_LABELS[category as VariableCategory];
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-xs"
                >
                  {categoryInfo.icon} {categoryInfo.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="space-y-6">
              {Object.entries(filteredGroups).map(([category, variables]) => (
                <VariableCategorySection
                  key={category}
                  category={category as VariableCategory}
                  variables={variables}
                  copiedKey={copiedKey}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(filteredGroups).map(([category, variables]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <VariableCategorySection
                category={category as VariableCategory}
                variables={variables}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
            </TabsContent>
          ))}
        </Tabs>

        {Object.keys(filteredGroups).length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No variables found matching "{searchQuery}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface VariableCategorySectionProps {
  category: VariableCategory;
  variables: VariableInfo[];
  copiedKey: string | null;
  onCopy: (key: string) => void;
}

function VariableCategorySection({
  category,
  variables,
  copiedKey,
  onCopy,
}: VariableCategorySectionProps) {
  const categoryInfo = CATEGORY_LABELS[category];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{categoryInfo.icon}</span>
        <h3 className="font-medium">{categoryInfo.label}</h3>
        <Badge variant="secondary" className="text-xs">
          {variables.length}
        </Badge>
      </div>

      <div className="grid gap-2">
        {variables.map((v) => (
          <div
            key={v.key}
            className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {`{{${v.key}}}`}
                </code>
                <span className="text-xs text-muted-foreground">{v.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{v.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: <span className="font-medium text-foreground">"{v.example}"</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(v.key)}
              className="shrink-0"
            >
              {copiedKey === v.key ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
