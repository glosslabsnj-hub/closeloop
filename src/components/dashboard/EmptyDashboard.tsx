/**
 * EmptyDashboard — Shown when a tenant has zero call sessions.
 * Guides new users toward setup completion and their first test call.
 */

import { Phone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentControlPanel } from "./AgentControlPanel";
import { SmartChecklist } from "./SmartChecklist";
import { SoundManager } from "@/components/notifications/SoundManager";

export function EmptyDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <SoundManager />

      {/* Agent Status */}
      <AgentControlPanel />

      {/* Test Your AI CTA */}
      <Card className="border-primary/20 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 glow-primary-sm shrink-0">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gradient-primary">Test Your AI</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Make a test call to hear how your AI handles a real conversation. 
                This is the fastest way to see your setup in action.
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => navigate("/app/simulator")}
              >
                Make a Test Call
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Checklist */}
      <SmartChecklist />
    </div>
  );
}
