import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Phone,
  PhoneForwarded,
  MessageSquare,
  Bot,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Settings,
  Zap,
  Clock,
  HelpCircle,
  PlayCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function HowToGuide() {
  const { toast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const exampleNumber = "+1 (555) 123-4567";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How To Guides</h2>
        <p className="text-muted-foreground">
          Step-by-step instructions to get your AI assistant up and running
        </p>
      </div>

      <Tabs defaultValue="connect-number" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="connect-number" className="flex flex-col gap-1 py-3 h-auto">
            <PhoneForwarded className="h-5 w-5" />
            <span className="text-xs">Connect Number</span>
          </TabsTrigger>
          <TabsTrigger value="new-number" className="flex flex-col gap-1 py-3 h-auto">
            <Phone className="h-5 w-5" />
            <span className="text-xs">Get New Number</span>
          </TabsTrigger>
          <TabsTrigger value="text-back" className="flex flex-col gap-1 py-3 h-auto">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Text-Back Setup</span>
          </TabsTrigger>
        </TabsList>

        {/* Connect Existing Number Guide */}
        <TabsContent value="connect-number" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <PhoneForwarded className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Connect Your Existing Business Number</CardTitle>
                  <CardDescription>
                    Keep your current number and forward unanswered calls to your AI
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  How It Works
                </h4>
                <p className="text-sm text-muted-foreground">
                  When someone calls your business number and you don't answer (busy, away, or after hours), 
                  the call automatically forwards to your CloseLoop AI. Your AI answers professionally, 
                  qualifies the lead, and books appointments directly into your calendar.
                </p>
              </div>

              {/* Step by Step */}
              <div className="space-y-4">
                <h4 className="font-medium">Step-by-Step Setup</h4>
                
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      1
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Enter Your Business Phone Number</h5>
                      <p className="text-sm text-muted-foreground">
                        Go to the Setup Wizard on your dashboard and enter the phone number you currently 
                        use for your business. This is the number your customers already call.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      2
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium">Get Your CloseLoop Forwarding Number</h5>
                      <p className="text-sm text-muted-foreground">
                        After connecting, you'll receive a CloseLoop number. This is where your calls 
                        will forward to when you can't answer.
                      </p>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-sm text-muted-foreground">Your forwarding number:</span>
                        <code className="font-mono font-bold text-primary">{exampleNumber}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(exampleNumber.replace(/\D/g, ""), "Number")}
                        >
                          {copiedItem === "Number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      3
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium">Set Up Call Forwarding on Your Phone</h5>
                      <p className="text-sm text-muted-foreground">
                        Configure your phone carrier to forward calls to your CloseLoop number when you're 
                        busy or don't answer. Choose your carrier below:
                      </p>
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="verizon">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-medium">Verizon</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">1</Badge>
                                Open your Phone app and go to Keypad
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">2</Badge>
                                Dial <code className="bg-muted px-1 rounded">*71{exampleNumber.replace(/\D/g, "")}</code>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">3</Badge>
                                Press Call and wait for confirmation beeps
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">4</Badge>
                                To disable: Dial <code className="bg-muted px-1 rounded">*73</code>
                              </li>
                            </ol>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="att">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-medium">AT&T</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">1</Badge>
                                Open your Phone app and go to Keypad
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">2</Badge>
                                Dial <code className="bg-muted px-1 rounded">*61*{exampleNumber.replace(/\D/g, "")}#</code>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">3</Badge>
                                Press Call and wait for confirmation
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">4</Badge>
                                To disable: Dial <code className="bg-muted px-1 rounded">#61#</code>
                              </li>
                            </ol>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="tmobile">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-medium">T-Mobile</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">1</Badge>
                                Open your Phone app and go to Keypad
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">2</Badge>
                                Dial <code className="bg-muted px-1 rounded">**61*{exampleNumber.replace(/\D/g, "")}#</code>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">3</Badge>
                                Press Call and wait for confirmation
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">4</Badge>
                                To disable: Dial <code className="bg-muted px-1 rounded">##61#</code>
                              </li>
                            </ol>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="iphone">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-medium flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              iPhone (All Carriers)
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">1</Badge>
                                Open <strong>Settings</strong> → <strong>Phone</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">2</Badge>
                                Tap <strong>Call Forwarding</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">3</Badge>
                                Toggle it <strong>ON</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">4</Badge>
                                Enter your CloseLoop number: <code className="bg-muted px-1 rounded">{exampleNumber}</code>
                              </li>
                            </ol>
                            <p className="text-xs text-muted-foreground mt-3">
                              Note: Some carriers don't show this option. Use the dialer codes above instead.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="android">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-medium flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              Android (Generic)
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">1</Badge>
                                Open <strong>Phone</strong> app → tap <strong>⋮</strong> → <strong>Settings</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">2</Badge>
                                Tap <strong>Calling accounts</strong> or <strong>Supplementary services</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">3</Badge>
                                Select <strong>Call forwarding</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">4</Badge>
                                Choose <strong>Forward when busy</strong> or <strong>Forward when unanswered</strong>
                              </li>
                              <li className="flex gap-2">
                                <Badge variant="outline" className="shrink-0">5</Badge>
                                Enter your CloseLoop number and save
                              </li>
                            </ol>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      4
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Test Your Setup</h5>
                      <p className="text-sm text-muted-foreground">
                        Call your business number from another phone and let it ring. Your AI should 
                        answer after the forwarding kicks in. Use our Simulator to test the AI voice quality.
                      </p>
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <a href="/app/simulator">
                          <PlayCircle className="h-4 w-4" />
                          Go to Simulator
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      5
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Go Live!</h5>
                      <p className="text-sm text-muted-foreground">
                        Once you're happy with your AI's responses, flip the "Go Live" switch on your 
                        dashboard. Your AI will now handle all forwarded calls 24/7.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Pro Tips
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Set forwarding to trigger after 3-4 rings to give yourself time to answer first</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Test during business hours to make sure everything works smoothly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Your customers will never know they're talking to AI - it sounds completely natural</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Get New Number Guide */}
        <TabsContent value="new-number" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Get a New CloseLoop Number</CardTitle>
                  <CardDescription>
                    Get a dedicated AI phone number for your business
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  How It Works
                </h4>
                <p className="text-sm text-muted-foreground">
                  We provision a brand new phone number just for your AI assistant. You can put this 
                  number on your website, business cards, or Google listing. Every call to this number 
                  goes directly to your AI - no forwarding setup needed.
                </p>
              </div>

              {/* Benefits */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <Zap className="h-5 w-5 text-primary mb-2" />
                  <h5 className="font-medium mb-1">Instant Setup</h5>
                  <p className="text-sm text-muted-foreground">
                    No carrier settings to configure. Your AI is ready to answer calls immediately.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Bot className="h-5 w-5 text-primary mb-2" />
                  <h5 className="font-medium mb-1">24/7 AI Coverage</h5>
                  <p className="text-sm text-muted-foreground">
                    Every call goes to your AI. Perfect for after-hours or when you're fully booked.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Phone className="h-5 w-5 text-primary mb-2" />
                  <h5 className="font-medium mb-1">Local Number</h5>
                  <p className="text-sm text-muted-foreground">
                    Get a number with your local area code so customers see a familiar number.
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <Settings className="h-5 w-5 text-primary mb-2" />
                  <h5 className="font-medium mb-1">Full Control</h5>
                  <p className="text-sm text-muted-foreground">
                    Pause, configure, or redirect the number anytime from your dashboard.
                  </p>
                </div>
              </div>

              {/* Step by Step */}
              <div className="space-y-4">
                <h4 className="font-medium">Step-by-Step Setup</h4>
                
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      1
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Choose "Get a New CloseLoop Number"</h5>
                      <p className="text-sm text-muted-foreground">
                        In the Setup Wizard, select the option to get a new number. We'll provision 
                        a number with your preferred area code instantly.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      2
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Receive Your New Number</h5>
                      <p className="text-sm text-muted-foreground">
                        Your new CloseLoop number will be displayed immediately. This is the number 
                        customers will call to reach your AI.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      3
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Configure Your AI Voice Agent</h5>
                      <p className="text-sm text-muted-foreground">
                        Set up your ElevenLabs Agent ID in the AI settings. This powers your AI's 
                        voice and personality.
                      </p>
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <a href="https://elevenlabs.io/conversational-ai" target="_blank" rel="noopener noreferrer">
                          Create ElevenLabs Agent
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      4
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Test Your AI</h5>
                      <p className="text-sm text-muted-foreground">
                        Use the browser-based voice test or have your AI call your personal phone. 
                        Make sure everything sounds perfect before going live.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      5
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Publish Your New Number</h5>
                      <p className="text-sm text-muted-foreground">
                        Add your new number to your website, Google Business listing, business cards, 
                        and anywhere else customers might look for your contact info.
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      6
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Go Live!</h5>
                      <p className="text-sm text-muted-foreground">
                        Flip the switch and your AI starts answering calls immediately. Welcome to 
                        24/7 customer service!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* When to use */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <h4 className="font-medium mb-3">Best For:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>New businesses setting up their first phone system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Businesses wanting a dedicated "book now" line</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>After-hours overflow when you want AI to handle all calls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Marketing campaigns with a trackable phone number</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text-Back Setup Guide */}
        <TabsContent value="text-back" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Set Up Automatic Text-Back</CardTitle>
                  <CardDescription>
                    Never lose a lead - automatically text customers who miss your call
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overview */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  How It Works
                </h4>
                <p className="text-sm text-muted-foreground">
                  When a customer calls and you can't answer, CloseLoop automatically sends them a 
                  personalized text message. The AI crafts the message based on your business context, 
                  and can continue the conversation via SMS to qualify leads and book appointments.
                </p>
              </div>

              {/* Visual Flow */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-lg bg-muted/30">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                    <Phone className="h-6 w-6 text-warning" />
                  </div>
                  <span className="text-sm font-medium">Missed Call</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90 sm:rotate-0" />
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Configurable Delay</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90 sm:rotate-0" />
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                    <MessageSquare className="h-6 w-6 text-success" />
                  </div>
                  <span className="text-sm font-medium">AI Text Sent</span>
                </div>
              </div>

              {/* Step by Step */}
              <div className="space-y-4">
                <h4 className="font-medium">Step-by-Step Setup</h4>
                
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      1
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Enable Auto Text-Back</h5>
                      <p className="text-sm text-muted-foreground">
                        Go to <strong>AI Assistant</strong> settings and toggle on "Instant Text-Back". 
                        This enables automatic SMS responses when calls are missed.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      2
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium">Set Your Response Delay</h5>
                      <p className="text-sm text-muted-foreground">
                        Choose how long to wait before sending the text. This gives you time to call 
                        back first if you prefer.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-lg border text-center">
                          <span className="text-lg font-bold text-primary">0s</span>
                          <p className="text-xs text-muted-foreground">Instant</p>
                        </div>
                        <div className="p-3 rounded-lg border text-center bg-primary/5 border-primary/30">
                          <span className="text-lg font-bold text-primary">30s</span>
                          <p className="text-xs text-muted-foreground">Recommended</p>
                        </div>
                        <div className="p-3 rounded-lg border text-center">
                          <span className="text-lg font-bold text-primary">2m</span>
                          <p className="text-xs text-muted-foreground">Delayed</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      3
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Complete Your Business Profile</h5>
                      <p className="text-sm text-muted-foreground">
                        The AI uses your business information to craft personalized messages. Make sure 
                        you've completed:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Business name and services</li>
                        <li>• Business hours</li>
                        <li>• Booking calendar link</li>
                        <li>• FAQs and common questions</li>
                      </ul>
                      <Button variant="outline" size="sm" asChild className="gap-2 mt-2">
                        <a href="/app/onboarding">
                          Complete Business Profile
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      4
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Test the Flow</h5>
                      <p className="text-sm text-muted-foreground">
                        Use the SMS Simulator to see exactly what your customers will receive. 
                        The AI generates contextual messages based on time of day and your business info.
                      </p>
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <a href="/app/simulator">
                          <PlayCircle className="h-4 w-4" />
                          Open SMS Simulator
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Messages */}
              <div className="space-y-3">
                <h4 className="font-medium">Example AI Messages</h4>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
                    <p className="text-sm italic">
                      "Hi! This is Mike's Auto Detailing. Sorry we missed your call! We're currently 
                      with a customer. How can we help you today? Would you like to book a detail?"
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">During business hours</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-warning">
                    <p className="text-sm italic">
                      "Thanks for calling Mike's Auto Detailing! We're closed for the evening but 
                      will be back at 8 AM tomorrow. Book online anytime at [link] or reply here 
                      and we'll get back to you first thing!"
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">After hours</p>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Pro Tips
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>30-second delay is ideal - gives you time to call back but still feels instant to customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Include your booking link in business profile so AI can share it in texts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>The AI continues the SMS conversation, answering questions and qualifying leads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>All conversations appear in your Inbox for easy follow-up</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
