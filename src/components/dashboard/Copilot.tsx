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
}

// Navigation map for the dashboard
const dashboardNavMap: Record<string, { path: string; description: string }> = {
  'menu': { path: '/app/menu', description: 'Menu Center - manage your menu items' },
  'services': { path: '/app/services', description: 'Services - manage your service offerings' },
  'bookings': { path: '/app/bookings', description: 'Bookings - view and manage appointments' },
  'orders': { path: '/app/orders', description: 'Orders - view and manage food orders' },
  'dispatch': { path: '/app/dispatch', description: 'Dispatch - manage dispatch jobs' },
  'calls': { path: '/app/calls', description: 'Calls - view AI call history' },
  'inbox': { path: '/app/inbox', description: 'Inbox - view all conversations' },
  'leads': { path: '/app/leads', description: 'Leads - manage your leads' },
  'settings': { path: '/app/settings', description: 'Settings - configure your account' },
  'brain': { path: '/app/brain', description: 'Business Brain - edit AI knowledge' },
  'usage': { path: '/app/usage', description: 'Usage - track your plan usage' },
  'simulator': { path: '/app/simulator', description: 'Simulator - test your AI' },
  'reservations': { path: '/app/reservations', description: 'Reservations - manage table reservations' },
  'catering': { path: '/app/catering', description: 'Catering - manage catering requests' },
  'medical': { path: '/app/medical-intake', description: 'Medical Intake - view patient intakes' },
};

// Common questions and answers
const knowledgeBase: Record<string, { answer: string; links?: { label: string; path: string }[]; steps?: string[] }> = {
  'phone': {
    answer: "Your AI phone number is shown in Settings > Phone. To connect your phone, go to the Phone Connection section.",
    links: [{ label: 'Go to Settings', path: '/app/settings' }],
  },
  'menu': {
    answer: "You can edit your menu in the Menu Center. Add items, set prices, and mark items as available or unavailable.",
    links: [{ label: 'Open Menu Center', path: '/app/menu' }],
    steps: ['Go to Menu Center', 'Click "Add Item" or edit existing items', 'Set name, price, and category', 'Save changes'],
  },
  'booking': {
    answer: "Bookings can be delivered via email, SMS, webhook, or viewed in the Bookings page. Configure delivery in Settings > Booking Delivery.",
    links: [
      { label: 'View Bookings', path: '/app/bookings' },
      { label: 'Configure Delivery', path: '/app/settings' },
    ],
    steps: ['Go to Settings', 'Click Booking Delivery tab', 'Enable your preferred delivery methods', 'Enter email/phone/webhook details'],
  },
  'dispatch': {
    answer: "Dispatch mode creates jobs with priority levels and location info. Jobs appear in the Dispatch queue for your team to assign and complete.",
    links: [{ label: 'View Dispatch Queue', path: '/app/dispatch' }],
  },
  'order': {
    answer: "Food orders are captured by the AI and appear in Orders. They can be printed as tickets or sent via webhook to your POS.",
    links: [{ label: 'View Orders', path: '/app/orders' }],
    steps: ['Orders appear in the Orders page', 'Click an order to view details', 'Mark as preparing/ready/completed', 'Enable auto-print in Settings'],
  },
  'faq': {
    answer: "FAQs help the AI answer common questions. Edit them in Business Brain > FAQs.",
    links: [{ label: 'Edit FAQs', path: '/app/brain' }],
  },
  'test': {
    answer: "You can test your AI using the Simulator. Try a voice call or SMS conversation to see how it handles customers.",
    links: [{ label: 'Open Simulator', path: '/app/simulator' }],
  },
  'hipaa': {
    answer: "HIPAA mode is enabled for medical businesses. It minimizes stored data and disables recordings/transcripts. Configure in Settings.",
    links: [{ label: 'HIPAA Settings', path: '/app/settings' }],
  },
};

function generateResponse(query: string, businessMode: string | undefined): Message {
  const lowerQuery = query.toLowerCase();
  
  // Check for known topics
  for (const [topic, response] of Object.entries(knowledgeBase)) {
    if (lowerQuery.includes(topic)) {
      return {
        role: 'assistant',
        content: response.answer,
        links: response.links,
        steps: response.steps,
      };
    }
  }

  // Check for navigation requests
  for (const [key, nav] of Object.entries(dashboardNavMap)) {
    if (lowerQuery.includes(key)) {
      return {
        role: 'assistant',
        content: `You can find ${nav.description}.`,
        links: [{ label: `Go to ${key}`, path: nav.path }],
      };
    }
  }

  // Mode-specific responses
  if (lowerQuery.includes('how') && lowerQuery.includes('work')) {
    if (businessMode === 'food') {
      return {
        role: 'assistant',
        content: "In Food mode, the AI takes orders, handles reservations, and manages catering requests. Orders go to your Orders page and can be printed or sent to your POS.",
        links: [
          { label: 'View Orders', path: '/app/orders' },
          { label: 'Menu Center', path: '/app/menu' },
        ],
      };
    }
    if (businessMode === 'dispatch') {
      return {
        role: 'assistant',
        content: "In Dispatch mode, the AI captures location, urgency, and job details. Jobs are prioritized and appear in your Dispatch queue for assignment.",
        links: [{ label: 'View Dispatch', path: '/app/dispatch' }],
      };
    }
    if (businessMode === 'medical') {
      return {
        role: 'assistant',
        content: "In Medical mode, the AI handles intake calls with HIPAA compliance. It collects reason for visit, insurance info, and schedules appointments.",
        links: [{ label: 'View Intakes', path: '/app/medical-intake' }],
      };
    }
  }

  // Default response
  return {
    role: 'assistant',
    content: "I'm here to help you navigate CloseLoop. You can ask me about:\n\n• How to edit your menu or services\n• Where to find bookings, orders, or dispatch jobs\n• How to configure delivery methods\n• How to test your AI\n• Any settings or configuration questions\n\nWhat would you like to know?",
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

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = `Hi! I'm your CloseLoop Copilot. I can help you:\n\n• Navigate the dashboard\n• Understand your ${businessMode || 'business'} setup\n• Find settings and features\n• Troubleshoot issues\n\nWhat can I help you with?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [isOpen, businessMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    const response = generateResponse(inputValue, businessMode);
    setTimeout(() => {
      setMessages(prev => [...prev, response]);
    }, 300);
    
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all ${
      isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'
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
              <p className="text-xs text-muted-foreground">Your dashboard assistant</p>
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
          <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%]`}>
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {/* Steps */}
                    {msg.steps && (
                      <div className="mt-2 bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs font-medium mb-2">Steps:</p>
                        <ol className="text-xs space-y-1">
                          {msg.steps.map((step, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="font-medium text-primary">{j + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Links */}
                    {msg.links && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.links.map((link, j) => (
                          <Link key={j} to={link.path}>
                            <Button variant="outline" size="sm" className="text-xs gap-1">
                              {link.label}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1">
              {['Where are my bookings?', 'How do I test AI?', 'Edit my menu'].map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => {
                    setInputValue(q);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
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
