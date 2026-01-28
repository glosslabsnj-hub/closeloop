import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Send, X, Minimize2, Maximize2, 
  ExternalLink, Sparkles, HelpCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Link } from "react-router-dom";

interface Message {
  role: 'assistant' | 'user';
  content: string;
  links?: { label: string; path: string }[];
  steps?: string[];
  nextActions?: string[];
}

// Navigation map with exact paths
const dashboardNavMap: Record<string, { path: string; tab?: string; description: string }> = {
  'menu': { path: '/app/menu', description: 'Menu Center' },
  'services': { path: '/app/services', description: 'Services' },
  'bookings': { path: '/app/bookings', description: 'Bookings' },
  'booking delivery': { path: '/app/settings', tab: 'booking', description: 'Settings → Booking Delivery' },
  'orders': { path: '/app/orders', description: 'Orders' },
  'order delivery': { path: '/app/settings', tab: 'food', description: 'Settings → Food → Order Delivery' },
  'dispatch': { path: '/app/dispatch', description: 'Dispatch' },
  'dispatch delivery': { path: '/app/settings', tab: 'dispatch', description: 'Settings → Dispatch Delivery' },
  'calls': { path: '/app/calls', description: 'Calls' },
  'inbox': { path: '/app/inbox', description: 'Inbox' },
  'leads': { path: '/app/leads', description: 'Leads' },
  'settings': { path: '/app/settings', description: 'Settings' },
  'phone': { path: '/app/settings', tab: 'phone', description: 'Settings → Phone' },
  'brain': { path: '/app/brain', description: 'Business Brain' },
  'usage': { path: '/app/usage', description: 'Usage' },
  'simulator': { path: '/app/simulator', description: 'Simulator' },
  'reservations': { path: '/app/reservations', description: 'Reservations' },
  'catering': { path: '/app/catering', description: 'Catering' },
  'medical': { path: '/app/medical-intake', description: 'Medical Intake' },
  'hipaa': { path: '/app/settings', tab: 'medical', description: 'Settings → Medical/HIPAA' },
};

// Troubleshooting playbook
const troubleshootingPlaybook: Record<string, { answer: string; steps: string[]; links?: { label: string; path: string }[] }> = {
  'call failed': {
    answer: "Call failures usually mean the phone isn't connected or there's a webhook issue.",
    steps: [
      "Go to Settings → Phone and verify your number is connected",
      "Check that connect_status shows 'connected'",
      "If using forwarding, confirm your carrier forwarding is active",
    ],
    links: [{ label: 'Go to Settings → Phone', path: '/app/settings' }],
  },
  'ai said none': {
    answer: "The AI is missing business data. Your Business Brain needs more information.",
    steps: [
      "Go to Business Brain",
      "Check your readiness score at the top",
      "Fill in any missing fields (name, hours, services)",
    ],
    links: [{ label: 'Open Business Brain', path: '/app/brain' }],
  },
  'wrong name': {
    answer: "The AI uses your business name from settings. Let's make sure it's set correctly.",
    steps: [
      "Go to Business Brain → Identity",
      "Verify your business name is correct",
      "Save and run a test call",
    ],
    links: [{ label: 'Open Business Brain', path: '/app/brain' }],
  },
  'webhook failed': {
    answer: "Webhook delivery failed. This usually means the endpoint URL is incorrect or unreachable.",
    steps: [
      "Go to the relevant delivery settings",
      "Verify your webhook URL is correct and accessible",
      "Click 'Retry' on the failed delivery",
      "Check your endpoint logs for errors",
    ],
  },
  'not printing': {
    answer: "Order tickets require print delivery to be enabled.",
    steps: [
      "Go to Settings → Food → Order Delivery",
      "Enable 'Auto Print' option",
      "Configure your print format",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
  },
};

// Knowledge base with structured responses
const knowledgeBase: Record<string, { answer: string; steps: string[]; links?: { label: string; path: string }[]; nextActions: string[] }> = {
  'edit menu': {
    answer: "You can edit your menu in Menu Center.",
    steps: [
      "Go to Menu Center from the sidebar",
      "Click 'Add Item' or edit existing items",
      "Set name, price, category, and dietary tags",
      "Save your changes",
    ],
    links: [{ label: 'Open Menu Center', path: '/app/menu' }],
    nextActions: ["Help me add a menu item", "Configure order delivery"],
  },
  'edit services': {
    answer: "Services are managed in the Services page.",
    steps: [
      "Go to Services from the sidebar",
      "Click 'Add Service' or edit existing",
      "Set name, duration, price, and deposit requirements",
      "Save your changes",
    ],
    links: [{ label: 'Open Services', path: '/app/services' }],
    nextActions: ["Help me configure booking delivery", "Set up availability"],
  },
  'booking delivery': {
    answer: "Bookings can be delivered via email, SMS, or webhook.",
    steps: [
      "Go to Settings → Booking Delivery",
      "Enable your preferred delivery methods",
      "Enter email/phone for notifications",
      "Add webhook URL if pushing to external system",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
    nextActions: ["Show me my bookings", "Test a booking flow"],
  },
  'order delivery': {
    answer: "Food orders can be printed as tickets or sent via webhook.",
    steps: [
      "Go to Settings → Food → Order Delivery",
      "Enable auto-print and/or webhook",
      "Set your print format preference",
      "Test with a sample order",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
    nextActions: ["Print a sample ticket", "View my orders"],
  },
  'dispatch delivery': {
    answer: "Dispatch jobs can be sent to your team via SMS or webhook.",
    steps: [
      "Go to Settings → Dispatch Delivery",
      "Enable SMS notifications for urgent jobs",
      "Add webhook URL if using dispatch software",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
    nextActions: ["View dispatch queue", "Configure urgency levels"],
  },
  'test': {
    answer: "You can test your AI in the Simulator.",
    steps: [
      "Go to Simulator from the sidebar",
      "Choose 'Test Call' or 'Test SMS'",
      "Run through a sample conversation",
      "Check that the AI responds correctly",
    ],
    links: [{ label: 'Open Simulator', path: '/app/simulator' }],
    nextActions: ["Check my readiness score", "Edit AI knowledge"],
  },
  'phone': {
    answer: "Your AI phone number is configured in Settings.",
    steps: [
      "Go to Settings → Phone",
      "View your assigned number or connect one",
      "Choose forwarding method if needed",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
    nextActions: ["Test my phone connection", "Run a test call"],
  },
  'readiness': {
    answer: "Your AI readiness score shows how well-prepared your Business Brain is.",
    steps: [
      "Go to Business Brain",
      "View your score at the top (0-100)",
      "Fill in missing sections to improve it",
    ],
    links: [{ label: 'Open Business Brain', path: '/app/brain' }],
    nextActions: ["What's missing from my setup?", "Run a test call"],
  },
  'faq': {
    answer: "FAQs help the AI answer common customer questions.",
    steps: [
      "Go to Business Brain → FAQs",
      "Add questions customers frequently ask",
      "Provide clear, accurate answers",
    ],
    links: [{ label: 'Open Business Brain', path: '/app/brain' }],
    nextActions: ["Add more FAQs", "Edit objection responses"],
  },
  'hipaa': {
    answer: "HIPAA mode minimizes stored data for medical compliance.",
    steps: [
      "Go to Settings → Medical/HIPAA",
      "Review storage settings (recordings/transcripts are OFF by default)",
      "Configure retention policies as needed",
    ],
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
    nextActions: ["View medical intakes", "Check compliance settings"],
  },
};

function generateResponse(query: string, businessMode: string | undefined, tenant: any): Message {
  const lowerQuery = query.toLowerCase();
  
  // Check troubleshooting first
  for (const [pattern, response] of Object.entries(troubleshootingPlaybook)) {
    if (lowerQuery.includes(pattern) || 
        (pattern === 'call failed' && (lowerQuery.includes('call') && (lowerQuery.includes('fail') || lowerQuery.includes("didn't") || lowerQuery.includes('not working')))) ||
        (pattern === 'ai said none' && (lowerQuery.includes('none') || lowerQuery.includes('placeholder'))) ||
        (pattern === 'webhook failed' && (lowerQuery.includes('webhook') && lowerQuery.includes('fail')))) {
      return {
        role: 'assistant',
        content: response.answer,
        steps: response.steps,
        links: response.links,
        nextActions: ["Run a test call", "Check my readiness score"],
      };
    }
  }

  // Check knowledge base
  for (const [topic, response] of Object.entries(knowledgeBase)) {
    const keywords = topic.split(' ');
    const matches = keywords.every(kw => lowerQuery.includes(kw));
    if (matches) {
      return {
        role: 'assistant',
        content: response.answer,
        steps: response.steps,
        links: response.links,
        nextActions: response.nextActions,
      };
    }
  }

  // Navigation requests
  for (const [key, nav] of Object.entries(dashboardNavMap)) {
    if (lowerQuery.includes(key) && (lowerQuery.includes('where') || lowerQuery.includes('find') || lowerQuery.includes('go') || lowerQuery.includes('open'))) {
      return {
        role: 'assistant',
        content: `You'll find that in ${nav.description}.`,
        steps: [`Go to ${nav.description}`, 'Make your changes', 'Save when done'],
        links: [{ label: `Go to ${nav.description}`, path: nav.path }],
        nextActions: ["Help me configure this", "Show me something else"],
      };
    }
  }

  // Mode-specific how it works
  if (lowerQuery.includes('how') && (lowerQuery.includes('work') || lowerQuery.includes('does'))) {
    if (businessMode === 'food') {
      return {
        role: 'assistant',
        content: "In Food mode, the AI takes orders, handles reservations, and captures special instructions.",
        steps: [
          "Customer calls → AI takes their order",
          "Order appears in your Orders page",
          "You can print tickets or push to POS via webhook",
          "Mark orders as preparing → ready → completed",
        ],
        links: [
          { label: 'View Orders', path: '/app/orders' },
          { label: 'Menu Center', path: '/app/menu' },
        ],
        nextActions: ["Configure order delivery", "Edit my menu"],
      };
    }
    if (businessMode === 'dispatch') {
      return {
        role: 'assistant',
        content: "In Dispatch mode, the AI captures location and urgency first, then creates a job.",
        steps: [
          "Customer calls → AI asks for location and situation",
          "Job appears in Dispatch queue with priority",
          "Assign to crew/vehicle",
          "Track status: dispatched → arrived → completed",
        ],
        links: [{ label: 'View Dispatch', path: '/app/dispatch' }],
        nextActions: ["Configure dispatch delivery", "View dispatch queue"],
      };
    }
    if (businessMode === 'medical') {
      return {
        role: 'assistant',
        content: "In Medical mode, the AI handles intake calls with HIPAA-ready features. It collects reason for visit and scheduling preferences without giving medical advice.",
        steps: [
          "Patient calls → AI captures reason for visit",
          "Collects insurance info and preferred timing",
          "Creates intake record (HIPAA mode minimizes stored data)",
          "Staff reviews and schedules appointment",
        ],
        links: [{ label: 'View Intakes', path: '/app/medical-intake' }],
        nextActions: ["Configure HIPAA settings", "View intakes"],
      };
    }
    // Default service mode
    return {
      role: 'assistant',
      content: "The AI answers calls, captures customer info, and pushes them to book.",
      steps: [
        "Customer calls → AI greets and qualifies",
        "Captures name, phone, service interest",
        "Sends booking link or creates appointment",
        "You see the lead/booking in your dashboard",
      ],
      links: [
        { label: 'View Bookings', path: '/app/bookings' },
        { label: 'View Leads', path: '/app/leads' },
      ],
      nextActions: ["Configure booking delivery", "Test a call"],
    };
  }

  // What can I do / help
  if (lowerQuery.includes('what can') || lowerQuery.includes('help')) {
    const modeSpecific = businessMode === 'food' ? 'orders, menu, reservations' :
                        businessMode === 'dispatch' ? 'dispatch queue, jobs, urgency' :
                        businessMode === 'medical' ? 'intakes, HIPAA settings' :
                        'bookings, services, leads';
    return {
      role: 'assistant',
      content: "I can help you navigate the dashboard and troubleshoot issues.",
      steps: [
        `Your mode: ${businessMode || 'service'} (${modeSpecific})`,
        "Ask where to find something",
        "Ask how to configure delivery",
        "Report an issue for troubleshooting",
      ],
      nextActions: ["How does this work?", "Run a test call", "Check my readiness"],
    };
  }

  // Default fallback
  return {
    role: 'assistant',
    content: "I'm here to help you use CloseLoop. Try asking about a specific feature.",
    steps: [
      "Ask 'Where is [feature]?' to navigate",
      "Ask 'How do I [task]?' for instructions",
      "Report issues like 'Call failed' or 'Webhook not working'",
    ],
    nextActions: ["How does my mode work?", "Test my AI", "Check readiness score"],
  };
}

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Copilot({ isOpen, onClose }: CopilotProps) {
  const { tenant } = useAuth();
  const { context } = useBusinessContext(tenant?.id || null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const businessMode = tenant?.business_mode;

  // Mode-aware quick actions
  const quickActions = businessMode === 'food' 
    ? ['Where are my orders?', 'How do I print tickets?', 'Edit my menu']
    : businessMode === 'dispatch'
    ? ['View dispatch queue', 'Configure urgency', 'Test a call']
    : businessMode === 'medical'
    ? ['View intakes', 'HIPAA settings', 'Test a call']
    : ['Where are bookings?', 'How do I test AI?', 'Edit services'];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "What are you trying to do right now?",
        nextActions: ["Finish setup", "Test calls", "Push bookings/orders to my system", "Troubleshoot something"],
      }]);
    }
  }, [isOpen]);

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
    
    const response = generateResponse(messageText, businessMode, tenant);
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
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              Copilot
              <Badge variant="secondary" className="text-xs">AI</Badge>
            </CardTitle>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">Dashboard assistant</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
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
