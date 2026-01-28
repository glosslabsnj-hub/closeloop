import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Send, Bot, User, Sparkles, 
  ArrowRight, X, Minimize2, Maximize2
} from "lucide-react";
import { TIERS, LADDER_STEPS, PRICING_CONFIG } from "@/config/pricing";
import { Link } from "react-router-dom";

interface Message {
  role: 'assistant' | 'user';
  content: string;
  options?: string[];
  recommendation?: RecommendedSetup;
}

interface RecommendedSetup {
  tier: string;
  sku: string;
  price: number;
  businessMode: string;
  modules: string[];
  reason: string;
}

const questions = [
  {
    id: 'industry',
    question: "What type of business do you run?",
    options: ['Auto Detailing', 'Restaurant/Food', 'Medical/Dental', 'Home Services', 'Towing/Dispatch', 'Other Service'],
  },
  {
    id: 'volume',
    question: "How many calls do you typically get per day?",
    options: ['1-5 calls', '5-15 calls', '15-30 calls', '30+ calls'],
  },
  {
    id: 'priority',
    question: "What's your biggest challenge right now?",
    options: ['Missing calls', 'Booking appointments', 'Taking orders', 'Following up with leads'],
  },
  {
    id: 'current',
    question: "How do you currently handle calls when you're busy?",
    options: ['Voicemail', 'Answering service', 'Miss them', 'Staff answers'],
  },
];

function generateRecommendation(answers: Record<string, string>): RecommendedSetup {
  const industry = answers['industry'] || '';
  const volume = answers['volume'] || '';
  const priority = answers['priority'] || '';
  
  // Determine business mode
  let businessMode = 'service';
  if (industry.includes('Restaurant') || industry.includes('Food')) {
    businessMode = 'food';
  } else if (industry.includes('Medical') || industry.includes('Dental')) {
    businessMode = 'medical';
  } else if (industry.includes('Towing') || industry.includes('Dispatch')) {
    businessMode = 'dispatch';
  }

  // Determine tier based on priority
  let tier = 'both';
  let sku = 'both-200-500';
  let reason = '';

  if (priority.includes('Missing calls') || priority.includes('Following up')) {
    tier = 'sms';
    sku = 'sms-500';
    reason = 'Since your main challenge is missing calls and follow-up, SMS Instant Respond will capture every lead instantly.';
  } else if (priority.includes('orders') || priority.includes('Booking')) {
    tier = 'voice';
    sku = 'voice-200';
    reason = 'For booking appointments and taking orders, Voice AI will handle conversations naturally and push customers to action.';
  } else {
    tier = 'both';
    sku = 'both-200-500';
    reason = 'For maximum conversion, Voice + SMS ensures every call is answered AND followed up automatically.';
  }

  // Upgrade SKU based on volume
  if (volume.includes('15-30') || volume.includes('30+')) {
    if (tier === 'sms') sku = 'sms-1500';
    if (tier === 'voice') sku = 'voice-600';
    if (tier === 'both') sku = 'both-600-1500';
  }

  const step = LADDER_STEPS.find(s => s.sku === sku);
  const price = step?.price || 299;

  const modules = ['booking'];
  if (businessMode === 'food') modules.push('food_orders', 'menu_knowledge');
  if (businessMode === 'dispatch') modules.push('dispatch_queue');
  if (businessMode === 'medical') modules.push('medical_intake');

  return {
    tier,
    sku,
    price,
    businessMode,
    modules,
    reason,
  };
}

export function SalesAIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm here to help you find the right CloseLoop setup for your business. I'll ask a few quick questions to recommend the perfect plan.\n\nBefore we start: CloseLoop requires a short but detailed setup so the AI truly knows your business. This takes about 10 minutes and ensures amazing call quality.",
        options: ['Let\'s do it!', 'Tell me more first'],
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleOptionClick = (option: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: option }]);

    if (option === 'Tell me more first') {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "CloseLoop is an AI receptionist that answers your calls 24/7, qualifies leads, and pushes them to booking.\n\n**What makes it different:**\n• Works for any industry (detailing, restaurants, medical, dispatch, etc.)\n• Captures real customer data, not just messages\n• Integrates with your existing systems\n• Takes about 10 minutes to set up\n\nReady to find your perfect setup?",
          options: ['Yes, let\'s go!'],
        }]);
      }, 500);
      return;
    }

    if (option === 'Let\'s do it!' || option === 'Yes, let\'s go!') {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: questions[0].question,
          options: questions[0].options,
        }]);
      }, 500);
      return;
    }

    // Regular question flow
    const questionId = questions[currentQuestion]?.id;
    if (questionId) {
      const newAnswers = { ...answers, [questionId]: option };
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: questions[currentQuestion + 1].question,
            options: questions[currentQuestion + 1].options,
          }]);
        }, 500);
      } else {
        // Generate recommendation
        const rec = generateRecommendation(newAnswers);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Based on your answers, here's my recommendation:`,
            recommendation: rec,
          }]);
        }, 500);
      }
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');

    // Simple response for custom input
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Thanks for sharing! Let me continue with the questions to give you the best recommendation.",
        options: currentQuestion < questions.length 
          ? questions[currentQuestion].options 
          : undefined,
      }]);
    }, 500);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all ${
      isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'
    }`}>
      {/* Header */}
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Sales Assistant</CardTitle>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">Find your perfect setup</p>
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
            onClick={() => setIsOpen(false)}
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
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {/* Options */}
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.options.map((opt, j) => (
                          <Button
                            key={j}
                            variant="outline"
                            size="sm"
                            onClick={() => handleOptionClick(opt)}
                            className="text-xs"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Recommendation Card */}
                    {msg.recommendation && (
                      <Card className="mt-3 border-primary">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="default">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Recommended
                            </Badge>
                            <span className="font-bold text-lg">
                              ${msg.recommendation.price}/mo
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {msg.recommendation.reason}
                          </p>

                          <div className="text-xs space-y-1">
                            <p><strong>Plan:</strong> {msg.recommendation.sku.toUpperCase()}</p>
                            <p><strong>Mode:</strong> {msg.recommendation.businessMode}</p>
                          </div>

                          <Link 
                            to={`/signup?tier=${msg.recommendation.tier}&sku=${msg.recommendation.sku}`}
                          >
                            <Button className="w-full gap-2 mt-2">
                              Start with this setup
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            7-day free trial • 10 min setup
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
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
