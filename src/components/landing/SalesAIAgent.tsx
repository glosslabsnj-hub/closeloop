import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Bot, Sparkles, 
  ArrowRight, X, Minimize2, Maximize2
} from "lucide-react";
import { TIERS, LADDER_STEPS, getTierInfo, getDefaultStepForTier } from "@/config/pricing";
import { Link } from "react-router-dom";

interface Message {
  role: 'assistant' | 'user';
  content: string;
  options?: string[];
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

// Discovery questions - asked one at a time, max 5
const discoveryQuestions = [
  {
    id: 'business_type',
    headline: "Let's find the right setup for you.",
    bullets: [
      "I'll ask a few quick questions to recommend the best plan.",
      "Takes about 2 minutes."
    ],
    question: "What type of business is this?",
    options: ['Service business', 'Towing / urgent dispatch', 'Restaurant', 'Medical / Dental', 'Other'],
  },
  {
    id: 'call_volume',
    headline: "Got it!",
    bullets: ["Call volume helps me recommend the right usage tier."],
    question: "About how many calls do you get per day?",
    options: ['0–5 calls', '6–20 calls', '21–60 calls', '60+ calls'],
  },
  {
    id: 'channel',
    headline: "Perfect.",
    bullets: [
      "Voice = AI answers live calls",
      "SMS = Auto text-back for missed calls",
      "Both = Maximum conversion"
    ],
    question: "Do you want the AI to answer calls, text missed calls, or both?",
    options: ['Voice only', 'SMS only', 'Both'],
  },
  {
    id: 'workflow',
    headline: "Almost there!",
    bullets: ["This determines which modules we enable."],
    question: "What's your main workflow?",
    options: ['Booking / scheduling', 'Dispatch / urgent jobs', 'Order taking', 'Just capture messages'],
  },
  {
    id: 'existing_system',
    headline: "Last question.",
    bullets: ["We can push data to your existing tools or be your main system."],
    question: "Do you already use a CRM or scheduler?",
    options: ['Yes, I have one', 'No, I need one', 'Not sure yet'],
  },
];

function generateRecommendation(answers: Record<string, string>): RecommendedSetup {
  const businessType = answers['business_type'] || '';
  const callVolume = answers['call_volume'] || '';
  const channel = answers['channel'] || '';
  const workflow = answers['workflow'] || '';
  
  // Determine business mode
  let businessMode = 'service';
  let businessTypeDisplay = 'Service Business';
  
  if (businessType.includes('Restaurant')) {
    businessMode = 'food';
    businessTypeDisplay = 'Restaurant / Food Service';
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

  // Determine tier based on channel preference
  let tier: 'sms' | 'voice' | 'both' = 'both';
  if (channel.includes('SMS only')) {
    tier = 'sms';
  } else if (channel.includes('Voice only')) {
    tier = 'voice';
  }

  // Get default SKU for tier
  const defaultStep = getDefaultStepForTier(tier);
  let sku = defaultStep?.sku || 'both-200-500';
  let price = defaultStep?.price || 299;

  // Upgrade SKU based on volume
  if (callVolume.includes('21–60') || callVolume.includes('60+')) {
    if (tier === 'sms') {
      sku = 'sms-1500';
      price = 149;
    } else if (tier === 'voice') {
      sku = 'voice-600';
      price = 299;
    } else {
      sku = 'both-600-1500';
      price = 399;
    }
  }

  // Build key features based on mode and workflow
  const keyFeatures: string[] = [];
  
  if (tier === 'voice' || tier === 'both') {
    keyFeatures.push('AI answers calls 24/7');
  }
  if (tier === 'sms' || tier === 'both') {
    keyFeatures.push('Instant missed-call text-back');
  }
  
  if (workflow.includes('Booking')) {
    keyFeatures.push('Pushes callers to book appointments');
  } else if (workflow.includes('Dispatch')) {
    keyFeatures.push('Captures location + urgency for dispatch');
  } else if (workflow.includes('Order')) {
    keyFeatures.push('Takes orders and captures preferences');
  } else {
    keyFeatures.push('Captures customer info automatically');
  }

  // Build "why it fits" bullets
  const whyItFits: string[] = [];
  
  if (businessMode === 'food') {
    whyItFits.push('Food mode handles orders, reservations, and catering inquiries');
  } else if (businessMode === 'medical') {
    whyItFits.push('Medical mode includes intake forms and scheduling guardrails');
  } else if (businessMode === 'dispatch') {
    whyItFits.push('Dispatch mode prioritizes urgency and location capture');
  } else {
    whyItFits.push('Service mode optimizes for booking appointments');
  }
  
  if (tier === 'both') {
    whyItFits.push('Voice + SMS gives you maximum lead capture');
  }
  
  if (callVolume.includes('21–60') || callVolume.includes('60+')) {
    whyItFits.push('Higher tier handles your call volume without overage surprises');
  }

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
  const [currentQuestion, setCurrentQuestion] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Direct opening - get to value fast
      setMessages([{
        role: 'assistant',
        content: "Tell me your business type and roughly how many calls you get per day, and I'll recommend the best setup in 60 seconds.",
        options: ['Service business', 'Towing / urgent dispatch', 'Restaurant', 'Medical / Dental', 'Other'],
      }]);
      setCurrentQuestion(0); // Start at business_type question
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const askNextQuestion = (questionIndex: number) => {
    if (questionIndex < discoveryQuestions.length) {
      const q = discoveryQuestions[questionIndex];
      const bullets = q.bullets.map(b => `• ${b}`).join('\n');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**${q.headline}**\n\n${bullets}\n\n${q.question}`,
        options: q.options,
      }]);
      setCurrentQuestion(questionIndex);
    }
  };

  const showRecommendation = (finalAnswers: Record<string, string>) => {
    const rec = generateRecommendation(finalAnswers);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `**Here's my recommendation based on what you told me:**`,
      recommendation: rec,
    }]);
  };

  const handleOptionClick = (option: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: option }]);

    // Handle intro responses
    if (currentQuestion === -1) {
      if (option === "Tell me more first") {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "**CloseLoop is an AI receptionist that works for any inbound-call business.**\n\n• Answers calls 24/7 or texts back missed calls\n• Captures real customer data (not just voicemail)\n• Pushes leads to booking, dispatch, or order systems\n• Takes ~10 minutes to go live\n\nReady to find your setup?",
            options: ["Yes, let's go"],
          }]);
        }, 300);
        return;
      }
      // Start discovery
      setTimeout(() => askNextQuestion(0), 300);
      return;
    }

    // Store answer
    const questionId = discoveryQuestions[currentQuestion]?.id;
    if (questionId) {
      const newAnswers = { ...answers, [questionId]: option };
      setAnswers(newAnswers);

      // Check if we have enough to recommend (after question 3 or 4)
      const canRecommend = currentQuestion >= 2 && (
        currentQuestion >= 3 || 
        option.includes('Just capture')
      );

      if (canRecommend || currentQuestion >= discoveryQuestions.length - 1) {
        // Show recommendation
        setTimeout(() => showRecommendation(newAnswers), 300);
      } else {
        // Ask next question
        setTimeout(() => askNextQuestion(currentQuestion + 1), 300);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentQuestion(-1);
    setAnswers({});
    setIsOpen(false);
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
      isMinimized ? 'w-72 h-14' : 'w-96 h-[520px]'
    }`}>
      {/* Header */}
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Sales Concierge</CardTitle>
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
            onClick={resetChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {msg.content.split('\n').map((line, j) => (
                        <p key={j} className={`${line.startsWith('**') ? 'font-semibold' : ''} ${j > 0 ? 'mt-1' : ''}`}>
                          {line.replace(/\*\*/g, '')}
                        </p>
                      ))}
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
                            className="text-xs h-8"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Recommendation Card */}
                    {msg.recommendation && (
                      <Card className="mt-3 border-primary/50">
                        <CardContent className="p-4 space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <Badge variant="default" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Recommended Setup
                            </Badge>
                            <span className="font-bold text-lg">
                              ${msg.recommendation.price}/mo
                            </span>
                          </div>

                          {/* Setup Details */}
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Business type:</span> {msg.recommendation.businessType}</p>
                            <p><span className="text-muted-foreground">Plan:</span> {msg.recommendation.planName}</p>
                          </div>

                          {/* Key Features */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Key features:</p>
                            <ul className="text-sm space-y-0.5">
                              {msg.recommendation.keyFeatures.map((f, k) => (
                                <li key={k}>• {f}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Why It Fits */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Why this fits:</p>
                            <ul className="text-sm space-y-0.5">
                              {msg.recommendation.whyItFits.map((w, k) => (
                                <li key={k}>• {w}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Next Steps */}
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs font-medium mb-1">Next steps (10 minutes):</p>
                            <ol className="text-xs space-y-0.5 list-decimal list-inside text-muted-foreground">
                              <li>Create your account</li>
                              <li>Complete guided onboarding</li>
                              <li>Connect number & test</li>
                            </ol>
                          </div>

                          {/* CTA */}
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
                            7-day free trial • Setup takes ~10 min
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
          <div className="p-3 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Pricing shown from config • No commitment to start
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

// Badge component inline for simplicity
function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary text-primary-foreground ${className}`}>
      {children}
    </span>
  );
}
