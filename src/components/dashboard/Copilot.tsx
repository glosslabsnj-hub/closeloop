import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Send, X, Minimize2, Maximize2, 
  ExternalLink, Sparkles, HelpCircle, RefreshCw, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  useCopilotContext, 
  CopilotContext,
  getPhoneStatusMessage,
  getReadinessMessage,
  getHandoffStatusMessage,
  isFeatureEnabled,
} from "@/hooks/useCopilotContext";

interface Message {
  role: 'assistant' | 'user';
  content: string;
  links?: { label: string; path: string }[];
  steps?: string[];
  nextActions?: string[];
}

// Generate context-aware responses
function generateResponse(query: string, ctx: CopilotContext): Message {
  const lowerQuery = query.toLowerCase();
  const mode = ctx.tenant.business_mode;
  const businessName = ctx.tenant.business_name || "your business";

  // === TROUBLESHOOTING: Call issues ===
  if (lowerQuery.includes('call') && (lowerQuery.includes('fail') || lowerQuery.includes("didn't") || lowerQuery.includes('not working') || lowerQuery.includes('start'))) {
    const phoneStatus = getPhoneStatusMessage(ctx);
    const steps = [];
    const links: { label: string; path: string }[] = [];

    if (!ctx.phone.assigned_number) {
      steps.push("Go to Settings → Phone", "Request a phone number", "Complete the forwarding setup");
      links.push({ label: "Go to Settings → Phone", path: "/app/settings" });
    } else if (!ctx.phone.is_connected) {
      steps.push(
        "Go to Settings → Phone",
        `Your number ${ctx.phone.assigned_number} is assigned but not connected`,
        "Follow the carrier forwarding instructions",
        "Verify the forwarding is active"
      );
      links.push({ label: "Go to Settings → Phone", path: "/app/settings" });
    } else {
      steps.push(
        "Your phone appears connected — run a test call in Simulator",
        "Check Calls page for recent activity",
        "If still failing, check your AI readiness score"
      );
      links.push(
        { label: "Open Simulator", path: "/app/simulator" },
        { label: "View Calls", path: "/app/calls" }
      );
    }

    return {
      role: 'assistant',
      content: phoneStatus,
      steps,
      links,
      nextActions: ["Run a test call", "Check my readiness score"],
    };
  }

  // === TROUBLESHOOTING: AI said None / wrong info ===
  if (lowerQuery.includes('none') || lowerQuery.includes('placeholder') || lowerQuery.includes('wrong name') || lowerQuery.includes('wrong business')) {
    const readiness = getReadinessMessage(ctx);
    return {
      role: 'assistant',
      content: readiness,
      steps: [
        "Go to Business Brain",
        ctx.setup.missing_critical_fields.length > 0 
          ? `Fill in: ${ctx.setup.missing_critical_fields.slice(0, 3).join(", ")}`
          : "Review your business info is correct",
        "Save and run a test call to verify"
      ],
      links: [{ label: "Open Business Brain", path: "/app/business-brain" }],
      nextActions: ["Run a test call", "What else is missing?"],
    };
  }

  // === TROUBLESHOOTING: Webhook failed ===
  if (lowerQuery.includes('webhook') && (lowerQuery.includes('fail') || lowerQuery.includes('error') || lowerQuery.includes('not working'))) {
    const deliveryType = mode === 'food' ? 'orders' : mode === 'dispatch' ? 'dispatch' : 'booking';
    const handoffStatus = getHandoffStatusMessage(ctx, deliveryType);
    const settingsPath = mode === 'food' ? '/app/settings' : mode === 'dispatch' ? '/app/settings' : '/app/settings';
    
    return {
      role: 'assistant',
      content: `Webhook failures usually mean the endpoint URL is incorrect or unreachable. ${handoffStatus}`,
      steps: [
        `Go to Settings → ${mode === 'food' ? 'Food → Order Delivery' : mode === 'dispatch' ? 'Dispatch Delivery' : 'Booking Delivery'}`,
        "Verify your webhook URL is correct and publicly accessible",
        "Click 'Retry' on any failed deliveries",
        "Check your endpoint logs for errors"
      ],
      links: [{ label: "Go to Settings", path: settingsPath }],
      nextActions: ["Show me recent activity", "Test the webhook"],
    };
  }

  // === HOW TO: Push bookings/orders to system ===
  if ((lowerQuery.includes('push') || lowerQuery.includes('send') || lowerQuery.includes('deliver')) && 
      (lowerQuery.includes('booking') || lowerQuery.includes('order') || lowerQuery.includes('dispatch') || lowerQuery.includes('system') || lowerQuery.includes('crm'))) {
    
    if (mode === 'food' || lowerQuery.includes('order')) {
      const orderStatus = getHandoffStatusMessage(ctx, 'orders');
      return {
        role: 'assistant',
        content: orderStatus,
        steps: [
          "Go to Settings → Food → Order Delivery",
          "Enable webhook delivery and enter your endpoint URL",
          "Optionally enable email/SMS notifications",
          "Enable auto-print if you want kitchen tickets"
        ],
        links: [{ label: "Configure Order Delivery", path: "/app/settings" }],
        nextActions: ["Print a sample ticket", "View my orders"],
      };
    }
    
    if (mode === 'dispatch' || lowerQuery.includes('dispatch')) {
      const dispatchStatus = getHandoffStatusMessage(ctx, 'dispatch');
      return {
        role: 'assistant',
        content: dispatchStatus,
        steps: [
          "Go to Settings → Dispatch Delivery",
          "Enable webhook and enter your dispatch software endpoint",
          "Set urgent SMS phone for high-priority jobs",
          "Test with a sample job"
        ],
        links: [{ label: "Configure Dispatch Delivery", path: "/app/settings" }],
        nextActions: ["View dispatch queue", "Test a dispatch job"],
      };
    }
    
    // Default: bookings
    const bookingStatus = getHandoffStatusMessage(ctx, 'booking');
    return {
      role: 'assistant',
      content: bookingStatus,
      steps: [
        "Go to Settings → Booking Delivery",
        "Enable your preferred delivery methods (webhook, email, SMS)",
        "Enter your CRM webhook URL if using an external system",
        "New bookings will be pushed automatically"
      ],
      links: [{ label: "Configure Booking Delivery", path: "/app/settings" }],
      nextActions: ["View my bookings", "Test a booking flow"],
    };
  }

  // === WHERE IS: Menu ===
  if (lowerQuery.includes('menu') && (lowerQuery.includes('where') || lowerQuery.includes('edit') || lowerQuery.includes('find'))) {
    if (!isFeatureEnabled(ctx, 'menu')) {
      return {
        role: 'assistant',
        content: "Menu Center is only available in Food mode or with the menu_knowledge module enabled.",
        steps: [
          "Your current mode is: " + mode,
          "To enable menu features, switch to Food mode in onboarding",
          "Or contact support to add the menu_knowledge module"
        ],
        nextActions: ["What mode am I in?", "How do I change modes?"],
      };
    }
    return {
      role: 'assistant',
      content: "Your menu is managed in Menu Center.",
      steps: [
        "Go to Menu Center from the sidebar",
        "Add items with name, price, category, and dietary tags",
        "Items marked unavailable won't be offered by the AI"
      ],
      links: [{ label: "Open Menu Center", path: "/app/menu-center" }],
      nextActions: ["How do orders work?", "Configure order delivery"],
    };
  }

  // === FINISH SETUP ===
  if (lowerQuery.includes('finish setup') || lowerQuery.includes('setup') || lowerQuery.includes('get started')) {
    const steps = [];
    const links: { label: string; path: string }[] = [];
    
    if (ctx.setup.readiness_score < 50) {
      steps.push(`Your readiness score is ${ctx.setup.readiness_score}/100 — let's improve it`);
      if (ctx.setup.missing_critical_fields.length > 0) {
        steps.push(`Missing: ${ctx.setup.missing_critical_fields.slice(0, 3).join(", ")}`);
      }
      links.push({ label: "Open Business Brain", path: "/app/business-brain" });
    }
    
    if (!ctx.phone.is_connected) {
      steps.push("Connect your phone number in Settings → Phone");
      links.push({ label: "Go to Settings → Phone", path: "/app/settings" });
    }
    
    steps.push("Run a test call in Simulator to verify everything works");
    links.push({ label: "Open Simulator", path: "/app/simulator" });
    
    return {
      role: 'assistant',
      content: `Let's finish setting up ${businessName}.`,
      steps,
      links,
      nextActions: ["Check readiness score", "Test my AI"],
    };
  }

  // === TEST CALLS ===
  if (lowerQuery.includes('test') && (lowerQuery.includes('call') || lowerQuery.includes('ai') || lowerQuery.includes('text'))) {
    return {
      role: 'assistant',
      content: "You can test your AI in the Simulator without using real minutes.",
      steps: [
        "Go to Simulator from the sidebar",
        "Choose 'Test Call' or 'Test SMS'",
        "Run through a sample conversation",
        "Check that responses match your business info"
      ],
      links: [{ label: "Open Simulator", path: "/app/simulator" }],
      nextActions: ["Check my readiness score", "View recent calls"],
    };
  }

  // === READINESS / WHAT'S MISSING ===
  if (lowerQuery.includes('readiness') || lowerQuery.includes('missing') || lowerQuery.includes('score')) {
    const readiness = getReadinessMessage(ctx);
    return {
      role: 'assistant',
      content: readiness,
      steps: ctx.setup.missing_critical_fields.length > 0
        ? ctx.setup.missing_critical_fields.map((f, i) => `${i + 1}. Add: ${f}`)
        : ["Your setup looks complete!", "Run a test call to verify"],
      links: [{ label: "Open Business Brain", path: "/app/business-brain" }],
      nextActions: ["Run a test call", "How does my mode work?"],
    };
  }

  // === HOW DOES THIS WORK (mode-specific) ===
  if (lowerQuery.includes('how') && (lowerQuery.includes('work') || lowerQuery.includes('does'))) {
    if (mode === 'food') {
      return {
        role: 'assistant',
        content: `In Food mode, the AI takes orders by phone and captures special instructions.`,
        steps: [
          "Customer calls → AI greets and takes order",
          "Order appears in Orders page",
          ctx.handoff.orders.auto_print ? "Tickets auto-print to your kitchen" : "Configure auto-print in Settings → Food",
          "Mark orders: preparing → ready → completed"
        ],
        links: [
          { label: "View Orders", path: "/app/orders" },
          { label: "Menu Center", path: "/app/menu-center" },
        ],
        nextActions: ["Configure order delivery", "Edit my menu"],
      };
    }
    if (mode === 'dispatch') {
      return {
        role: 'assistant',
        content: `In Dispatch mode, the AI captures location and urgency first, then creates a job.`,
        steps: [
          "Customer calls → AI asks for location and situation",
          "Job appears in Dispatch queue with priority",
          "Assign to crew/vehicle",
          "Track: dispatched → arrived → completed"
        ],
        links: [{ label: "View Dispatch", path: "/app/dispatch" }],
        nextActions: ["Configure dispatch delivery", "View dispatch queue"],
      };
    }
    if (mode === 'medical') {
      return {
        role: 'assistant',
        content: `In Medical mode, the AI handles intake calls with HIPAA-ready features.`,
        steps: [
          "Patient calls → AI captures reason for visit",
          "Collects insurance and preferred timing",
          ctx.hipaa_mode ? "HIPAA mode minimizes stored data" : "Consider enabling HIPAA mode in Settings",
          "Staff reviews and schedules appointment"
        ],
        links: [{ label: "View Intakes", path: "/app/medical-intake" }],
        nextActions: ["Configure HIPAA settings", "View intakes"],
      };
    }
    // Service mode default
    return {
      role: 'assistant',
      content: `The AI answers calls for ${businessName}, qualifies leads, and pushes to book.`,
      steps: [
        "Customer calls → AI greets and qualifies",
        "Captures name, phone, service interest",
        ctx.handoff.booking.enabled ? "Bookings are delivered via " + (ctx.handoff.booking.has_webhook ? "webhook" : "email/SMS") : "Configure booking delivery in Settings",
        "View leads and bookings in dashboard"
      ],
      links: [
        { label: "View Bookings", path: "/app/bookings" },
        { label: "View Leads", path: "/app/leads" },
      ],
      nextActions: ["Configure booking delivery", "Test a call"],
    };
  }

  // === PHONE STATUS ===
  if (lowerQuery.includes('phone') || lowerQuery.includes('number') || lowerQuery.includes('connected')) {
    const phoneStatus = getPhoneStatusMessage(ctx);
    return {
      role: 'assistant',
      content: phoneStatus,
      steps: ctx.phone.is_connected
        ? ["Your phone is ready", "Run a test call to verify", "Check Calls page for activity"]
        : ["Go to Settings → Phone", "Complete the connection setup", "Verify carrier forwarding if needed"],
      links: [{ label: "Go to Settings → Phone", path: "/app/settings" }],
      nextActions: ["Run a test call", "Check my readiness"],
    };
  }

  // === RECENT ACTIVITY ===
  if (lowerQuery.includes('recent') || lowerQuery.includes('activity') || lowerQuery.includes('last')) {
    const activity = ctx.recent_activity;
    const summary: string[] = [];
    
    if (activity.calls.length > 0) {
      summary.push(`${activity.calls.length} recent calls`);
    }
    if (activity.bookings.length > 0) {
      summary.push(`${activity.bookings.length} recent bookings`);
    }
    if (activity.orders.length > 0) {
      summary.push(`${activity.orders.length} recent orders`);
    }
    if (activity.dispatch_jobs.length > 0) {
      summary.push(`${activity.dispatch_jobs.length} recent dispatch jobs`);
    }
    
    const relevantPath = mode === 'food' ? '/app/orders' 
      : mode === 'dispatch' ? '/app/dispatch' 
      : '/app/bookings';
    const relevantLabel = mode === 'food' ? 'View Orders' 
      : mode === 'dispatch' ? 'View Dispatch' 
      : 'View Bookings';
    
    return {
      role: 'assistant',
      content: summary.length > 0 ? `Recent activity: ${summary.join(", ")}.` : "No recent activity yet.",
      links: [
        { label: "View Calls", path: "/app/calls" },
        { label: relevantLabel, path: relevantPath },
      ],
      nextActions: ["Run a test call", "Check my readiness"],
    };
  }

  // === TROUBLESHOOT SOMETHING ===
  if (lowerQuery.includes('troubleshoot')) {
    return {
      role: 'assistant',
      content: "I can help troubleshoot. What's the issue?",
      steps: [
        "Call didn't start or failed",
        "AI said wrong information or 'None'",
        "Webhook delivery failed",
        "Something else"
      ],
      nextActions: ["Call failed", "AI said wrong info", "Webhook failed"],
    };
  }

  // === DEFAULT FALLBACK ===
  const modeFeatures = mode === 'food' ? 'orders, menu, reservations' :
                       mode === 'dispatch' ? 'dispatch queue, jobs' :
                       mode === 'medical' ? 'intakes, HIPAA settings' :
                       'bookings, services, leads';
  
  return {
    role: 'assistant',
    content: `I'm here to help you use CloseLoop. You're in ${mode} mode (${modeFeatures}).`,
    steps: [
      "Ask 'Where is [feature]?' to navigate",
      "Ask 'How do I [task]?' for step-by-step help",
      "Report issues like 'Call failed' or 'Webhook not working'"
    ],
    nextActions: ["How does my mode work?", "Test my AI", "Check readiness score"],
  };
}

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Copilot({ isOpen, onClose }: CopilotProps) {
  const { context, loading, refetch } = useCopilotContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const mode = context.tenant.business_mode;

  // Mode-aware quick actions
  const quickActions = mode === 'food' 
    ? ['Where are my orders?', 'How do I print tickets?', 'Edit my menu']
    : mode === 'dispatch'
    ? ['View dispatch queue', 'Configure delivery', 'Test a call']
    : mode === 'medical'
    ? ['View intakes', 'HIPAA settings', 'Test a call']
    : ['Where are bookings?', 'How do I test AI?', 'Check readiness'];

  // Initial greeting with tenant-aware options
  useEffect(() => {
    if (isOpen && messages.length === 0 && !loading) {
      const readinessHint = context.setup.readiness_score < 50 
        ? `Your setup is ${context.setup.readiness_score}% complete.` 
        : "";
      
      setMessages([{
        role: 'assistant',
        content: `What are you trying to do right now?${readinessHint ? ` ${readinessHint}` : ""}`,
        nextActions: ["Finish setup", "Test calls", "Push bookings/orders to my system", "Troubleshoot something"],
      }]);
    }
  }, [isOpen, loading, context.setup.readiness_score]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (overrideValue?: string) => {
    const messageText = overrideValue || inputValue;
    if (!messageText.trim()) return;
    
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    
    const response = generateResponse(messageText, context);
    setTimeout(() => {
      setMessages(prev => [...prev, response]);
    }, 300);
    
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all ${
      isMinimized ? 'w-72 h-14' : 'w-96 h-[520px]'
    }`}>
      {/* Header */}
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Copilot
              <Badge variant="secondary" className="text-xs">{mode}</Badge>
            </CardTitle>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">
                {context.tenant.business_name || "Dashboard assistant"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={refetch}
            title="Refresh context"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[360px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%]`}>
                    {/* Answer */}
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {/* Steps */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div className="mt-2 bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs font-medium mb-2">Steps:</p>
                        <ol className="text-xs space-y-1">
                          {msg.steps.map((step, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="font-medium text-primary shrink-0">{j + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Links */}
                    {msg.links && msg.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.links.map((link, j) => (
                          <Link key={j} to={link.path}>
                            <Button variant="outline" size="sm" className="text-xs gap-1 h-7">
                              {link.label}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* What I can do next */}
                    {msg.nextActions && msg.nextActions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">What I can do next:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.nextActions.map((action, j) => (
                            <Button
                              key={j}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => handleSendMessage(action)}
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1">
              {quickActions.map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => handleSendMessage(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 text-sm"
              />
              <Button type="submit" size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}

// Floating trigger button for Copilot
export function CopilotTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
      size="icon"
    >
      <HelpCircle className="h-5 w-5" />
    </Button>
  );
}
