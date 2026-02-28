import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID || "yltzlvzgwkidbeqaoevp";
const ELEVENLABS_INIT_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/elevenlabs-init`;

export function ElevenLabsInitWebhookCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ELEVENLABS_INIT_URL);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please copy the URL manually",
      });
    }
  };

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Zap className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              ElevenLabs Initiation Webhook
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Inject business context when calls start
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              readOnly
              value={ELEVENLABS_INIT_URL}
              className="font-mono text-xs bg-background"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this URL in ElevenLabs → Settings → Conversation Initiation Client Data Webhook
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium">This webhook provides:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Business name, hours, and services pricing</li>
            <li>• Menu items (for food businesses)</li>
            <li>• FAQs and booking links</li>
            <li>• HIPAA-compliant data filtering</li>
          </ul>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          asChild
        >
          <a
            href="https://elevenlabs.io/docs/conversational-ai/customization/personalization/dynamic-variables"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            ElevenLabs Documentation
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
