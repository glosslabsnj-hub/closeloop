import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Printer,
  CalendarDays,
  Cake,
  BookOpen,
  ArrowRight,
  Phone,
  Bell,
} from "lucide-react";

interface HelpGuideFoodProps {
  searchQuery?: string;
}

export function HelpGuideFood({ searchQuery = "" }: HelpGuideFoodProps) {
  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const sections = [
    {
      id: "overview",
      title: "How Food Orders Work",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            When customers call to place an order, your AI takes their order, confirms items 
            and modifications, and sends it to your kitchen queue.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Phone className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Phone Orders</h4>
              <p className="text-sm text-muted-foreground">
                AI takes orders naturally, confirming items and pricing
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Printer className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Kitchen Tickets</h4>
              <p className="text-sm text-muted-foreground">
                Print tickets or view orders on your kitchen display
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "order-queue",
      title: "Managing the Order Queue",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Orders page shows all incoming orders. Mark them as you prepare and complete them.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-lg bg-muted/30">
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm">Pending</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">Confirmed</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">Preparing</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm">Ready</span>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-2">Order types:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Pickup</strong> - Customer picks up at your location</li>
              <li>• <strong>Delivery</strong> - Order needs to be delivered</li>
              <li>• <strong>Dine-in</strong> - Customer eating at the restaurant</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "menu-management",
      title: "Managing Your Menu",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Menu Center is where you manage all items your AI can sell. Keep it up to date 
            so your AI always has accurate pricing and availability.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Menu features
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Categories</strong> - Organize items (Appetizers, Mains, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Modifiers</strong> - Add options (size, toppings, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Availability</strong> - Mark items as sold out</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span><strong>Descriptions</strong> - AI reads these to customers</span>
              </li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/business-brain" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Edit Menu in Business Brain
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "reservations",
      title: "Handling Reservations",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your AI can book table reservations based on your capacity and hours.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <CalendarDays className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Table Booking</h4>
              <p className="text-sm text-muted-foreground">
                Customers request date, time, and party size
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium mb-1">Confirmations</h4>
              <p className="text-sm text-muted-foreground">
                Send automatic reminders before the reservation
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/reservations" className="gap-2">
              View Reservations
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "catering",
      title: "Catering Requests",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            For large orders and events, your AI collects catering details and creates a 
            request for you to follow up on.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Cake className="h-4 w-4 text-primary" />
              Information collected
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Event date and time</li>
              <li>• Guest count</li>
              <li>• Menu preferences</li>
              <li>• Dietary restrictions</li>
              <li>• Budget range</li>
              <li>• Delivery location</li>
            </ul>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/app/catering" className="gap-2">
              View Catering Requests
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ),
    },
    {
      id: "printing",
      title: "Printing Kitchen Tickets",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Print order tickets for your kitchen staff directly from the Orders page.
          </p>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="font-medium mb-2">To print a ticket:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Go to <strong>Orders</strong></li>
              <li>2. Find the order you want to print</li>
              <li>3. Click the <strong>Print</strong> button or <strong>View Ticket</strong></li>
              <li>4. Use your browser's print function (Ctrl/Cmd + P)</li>
            </ol>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(s => matchesSearch(s.title));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Orders & Menu</CardTitle>
              <CardDescription>
                Take orders, manage menu, and handle reservations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="overview" className="w-full">
            {filteredSections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>{section.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
