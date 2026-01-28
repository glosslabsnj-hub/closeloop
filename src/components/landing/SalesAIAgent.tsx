import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Bot, Sparkles, 
  ArrowRight, X, Minimize2, Maximize2, HelpCircle, Volume2
} from "lucide-react";
import { TIERS, LADDER_STEPS, getTierInfo, getDefaultStepForTier } from "@/config/pricing";
import { Link } from "react-router-dom";

interface Message {
  role: 'assistant' | 'user';
  content: string;
  options?: string[];
  quickActions?: string[];
  recommendation?: RecommendedSetup;
}

interface RecommendedSetup {
  businessType: string;
  businessMode: string;
  tier: string;
  planName: string;
  sku: string;
  price: number;
  keyFeatures: string[];
  whyItFits: string[];
}

const discoveryQuestions = [
  {
    id: 'business_type',
    question: "What type of business do you have?",
    options: ['Service business', 'Towing / dispatch', 'Restaurant', 'Medical / Dental', 'Other'],
  },
  {
    id: 'call_volume',
    question: "About how many calls per day?",
    options: ['0–5', '6–20', '21–60', '60+'],
  },
  {
    id: 'channel',
    question: "How should we handle calls?",
    options: ['Voice (AI answers live)', 'SMS (text-back)', 'Both'],
  },
];

function generateRecommendation(answers: Record<string, string>): RecommendedSetup {
  const businessType = answers['business_type'] || '';
  const callVolume = answers['call_volume'] || '';
  const channel = answers['channel'] || '';
  
  let businessMode = 'service';
  let businessTypeDisplay = 'Service Business';
  
  if (businessType.includes('Restaurant')) {
    businessMode = 'food';
    businessTypeDisplay = 'Restaurant / Food';
  } else if (businessType.includes('Medical') || businessType.includes('Dental')) {
    businessMode = 'medical';
    businessTypeDisplay = 'Medical / Healthcare';
  } else if (businessType.includes('Towing') || businessType.includes('dispatch')) {
    businessMode = 'dispatch';
    businessTypeDisplay = 'Towing / Dispatch';
  } else if (businessType.includes('Other')) {
    businessMode = 'general';
    businessTypeDisplay = 'General Business';
  }

  let tier: 'sms' | 'voice' | 'both' = 'both';
  if (channel.includes('SMS')) tier = 'sms';
  else if (channel.includes('Voice')) tier = 'voice';

  const defaultStep = getDefaultStepForTier(tier);
  let sku = defaultStep?.sku || 'both-200-500';
  let price = defaultStep?.price || 299;

  if (callVolume.includes('21–60') || callVolume.includes('60+')) {
    if (tier === 'sms') { sku = 'sms-1500'; price = 149; }
    else if (tier === 'voice') { sku = 'voice-600'; price = 299; }
    else { sku = 'both-600-1500'; price = 399; }
  }

  const keyFeatures: string[] = [];
  if (tier === 'voice' || tier === 'both') keyFeatures.push('AI answers calls 24/7');
  if (tier === 'sms' || tier === 'both') keyFeatures.push('Instant missed-call text-back');
  keyFeatures.push('Captures customer data automatically');

  const whyItFits: string[] = [];
  if (businessMode === 'food') whyItFits.push('Handles orders, reservations, catering');
  else if (businessMode === 'medical') whyItFits.push('Includes intake forms & scheduling');
  else if (businessMode === 'dispatch') whyItFits.push('Prioritizes urgency & location');
  else whyItFits.push('Optimized for booking appointments');
  
  if (tier === 'both') whyItFits.push('Maximum lead capture with Voice + SMS');

  const tierInfo = getTierInfo(tier);

  return {
    businessType: businessTypeDisplay,
    businessMode,
    tier,
    planName: tierInfo?.displayName || 'Voice + SMS',
    sku,
    price,
    keyFeatures,
    whyItFits,
  };
}

export function SalesAIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I can help you find the right setup in 60 seconds. What would you like to do?",
        quickActions: ["Help me choose a plan", "Will it work for my business?", "Hear a demo call"],
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const askQuestion = (index: number) => {
    if (index < discoveryQuestions.length) {
      const q = discoveryQuestions[index];
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: q.question,
        options: q.options,
      }]);
      setCurrentQuestion(index);
    }
  };

  const showRecommendation = (finalAnswers: Record<string, string>) => {
    const rec = generateRecommendation(finalAnswers);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "Based on what you told me, here's my recommendation:",
      recommendation: rec,
    }]);
  };

  const handleQuickAction = (action: string) => {
    setMessages(prev => [...prev, { role: 'user', content: action }]);
    
    if (action.includes("demo")) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Great choice! Scroll down to the 'Hear How It Works' section to play real demo calls for different industries.",
        }]);
        setTimeout(() => setIsOpen(false), 2000);
        document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return;
    }
    
    if (action.includes("work for my business") || action.includes("choose")) {
      setTimeout(() => askQuestion(0), 300);
    }
  };

  const handleOptionClick = (option: string) => {
    setMessages(prev => [...prev, { role: 'user', content: option }]);
    
    const questionId = discoveryQuestions[currentQuestion]?.id;
    if (questionId) {
      const newAnswers = { ...answers, [questionId]: option };
      setAnswers(newAnswers);

      if (currentQuestion >= discoveryQuestions.length - 1) {
        setTimeout(() => showRecommendation(newAnswers), 300);
      } else {
        setTimeout(() => askQuestion(currentQuestion + 1), 300);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentQuestion(0);
    setAnswers({});
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 shadow-2xl border-2 transition-all duration-200 ${
      isMinimized ? 'w-72 h-14' : 'w-[350px] md:w-[400px] h-[500px]'
    }`}>
      {/* Header */}
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-card rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">CloseLoop Assistant</CardTitle>
            {!isMinimized && (
              <p className="text-xs text-muted-foreground">Find your perfect setup</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
            onClick={resetChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[380px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[90%]">
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                    
                    {/* Quick Actions */}
                    {msg.quickActions && (
                      <div className="flex flex-col gap-2 mt-3">
                        {msg.quickActions.map((action, j) => (
                          <Button
                            key={j}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(action)}
                            className="justify-start text-left h-auto py-2 px-3 text-sm"
                          >
                            {action.includes("demo") && <Volume2 className="h-4 w-4 mr-2 shrink-0" />}
                            {action.includes("work") && <HelpCircle className="h-4 w-4 mr-2 shrink-0" />}
                            {action.includes("choose") && <Sparkles className="h-4 w-4 mr-2 shrink-0" />}
                            {action}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {/* Options */}
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.options.map((opt, j) => (
                          <Button
                            key={j}
                            variant="outline"
                            size="sm"
                            onClick={() => handleOptionClick(opt)}
                            className="text-sm h-9"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Recommendation Card */}
                    {msg.recommendation && (
                      <Card className="mt-3 border-primary">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge className="gap-1 bg-primary text-primary-foreground">
                              <Sparkles className="h-3 w-3" />
                              Recommended
                            </Badge>
                            <span className="font-bold text-xl">
                              ${msg.recommendation.price}/mo
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Type:</span> {msg.recommendation.businessType}</p>
                            <p><span className="text-muted-foreground">Plan:</span> {msg.recommendation.planName}</p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">What you get:</p>
                            <ul className="text-sm space-y-1">
                              {msg.recommendation.keyFeatures.map((f, k) => (
                                <li key={k} className="flex items-center gap-2">
                                  <span className="text-primary">✓</span> {f}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Link 
                            to={`/signup?tier=${msg.recommendation.tier}&sku=${msg.recommendation.sku}&mode=${msg.recommendation.businessMode}`}
                            className="block"
                          >
                            <Button className="w-full gap-2">
                              Start with this setup
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            7-day free trial • Setup in ~10 min
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              Powered by CloseLoop
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
