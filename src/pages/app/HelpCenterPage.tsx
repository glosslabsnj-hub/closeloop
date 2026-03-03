import { useState } from "react";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  Phone, 
  Calendar, 
  MessageSquare,
  Bot,
  Settings,
  Truck,
  UtensilsCrossed,
  Stethoscope,
  Zap,
  Users,
  Brain,
  HelpCircle
} from "lucide-react";
import { HelpGuidePhone } from "@/components/help/HelpGuidePhone";
import { HelpGuideDashboard } from "@/components/help/HelpGuideDashboard";
import { HelpGuideBookings } from "@/components/help/HelpGuideBookings";
import { HelpGuideDispatch } from "@/components/help/HelpGuideDispatch";
import { HelpGuideFood } from "@/components/help/HelpGuideFood";
import { HelpGuideMedical } from "@/components/help/HelpGuideMedical";
import { HelpGuideBrain } from "@/components/help/HelpGuideBrain";
import { HelpGuideSettings } from "@/components/help/HelpGuideSettings";
import { HelpGuideWorkflows } from "@/components/help/HelpGuideWorkflows";
import ErrorBoundary from "@/components/ErrorBoundary";

interface GuideCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  requiredModules?: string[];
  forModes?: BusinessMode[];
}

const allCategories: GuideCategory[] = [
  { 
    id: "getting-started", 
    label: "Getting Started", 
    icon: BookOpen,
    description: "Dashboard basics and initial setup"
  },
  { 
    id: "phone-setup", 
    label: "Phone Setup", 
    icon: Phone,
    description: "Connect your phone and enable AI answering"
  },
  { 
    id: "bookings", 
    label: "Bookings & Calendar", 
    icon: Calendar,
    description: "Manage appointments and scheduling",
    requiredModules: ["booking"],
    forModes: ["service", "medical"]
  },
  { 
    id: "dispatch", 
    label: "Dispatch & Jobs", 
    icon: Truck,
    description: "Handle service requests and job assignments",
    requiredModules: ["dispatch_queue"],
    forModes: ["dispatch"]
  },
  { 
    id: "food", 
    label: "Orders & Menu", 
    icon: UtensilsCrossed,
    description: "Take orders, manage menu, and handle reservations",
    requiredModules: ["food_orders"],
    forModes: ["food"]
  },
  { 
    id: "medical", 
    label: "Medical Intake", 
    icon: Stethoscope,
    description: "Patient intake, HIPAA compliance, and scheduling",
    requiredModules: ["medical_intake"],
    forModes: ["medical"]
  },
  { 
    id: "business-brain", 
    label: "Business Brain", 
    icon: Brain,
    description: "Train your AI with your business knowledge"
  },
  { 
    id: "automations", 
    label: "Automations", 
    icon: Zap,
    description: "Set up automatic workflows and triggers"
  },
  { 
    id: "settings", 
    label: "Settings & Team", 
    icon: Settings,
    description: "Configure your account and manage team"
  }
];

export default function HelpCenterPage() {
  const { businessMode, enabledModules } = useTenantConfig();
  const { terms } = useIndustryContext();
  const { _tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");

  // Capitalize helper
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Filter categories based on business mode and enabled modules
  const filteredCategories = allCategories.filter(cat => {
    // If no mode requirement, always show
    if (!cat.forModes && !cat.requiredModules) return true;

    // Check mode-specific categories
    if (cat.forModes && !cat.forModes.includes(businessMode)) return false;

    // Check module requirements
    if (cat.requiredModules) {
      return cat.requiredModules.some(mod => enabledModules.includes(mod));
    }

    return true;
  }).map(cat => {
    // Dynamic terminology for bookings category
    if (cat.id === "bookings") {
      return {
        ...cat,
        label: `${cap(terms.bookings)} & Calendar`,
        description: `Manage ${terms.bookings} and scheduling`,
      };
    }
    return cat;
  });

  // Mode-specific welcome message
  const getModeDescription = () => {
    switch (businessMode) {
      case "service":
        return `Learn how to manage ${terms.bookings}, handle leads, and let your AI take care of missed calls.`;
      case "dispatch":
        return "Learn how to manage dispatch jobs, prioritize urgent requests, and automate customer communication.";
      case "food":
        return "Learn how to take orders, manage your menu, handle reservations, and automate order confirmations.";
      case "medical":
        return `Learn how to handle patient intake, schedule ${terms.bookings}, and maintain HIPAA compliance.`;
      case "sales":
        return `Learn how to manage prospects, schedule ${terms.bookings}, and let your AI qualify every lead.`;
      default:
        return "Learn how to manage leads, handle inquiries, and let your AI capture every opportunity.";
    }
  };

  return (
    <ErrorBoundary context="loading the help center">
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Help Center</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {getModeDescription()}
        </p>
        <Badge variant="secondary" className="mt-3">
          {businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} Mode
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 mb-6">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full border border-border/30 bg-card/60 backdrop-blur-sm card-interactive transition-all duration-150"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Content Panels */}
        <TabsContent value="getting-started" className="mt-0">
          <HelpGuideDashboard mode={businessMode} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="phone-setup" className="mt-0">
          <HelpGuidePhone searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="bookings" className="mt-0">
          <HelpGuideBookings mode={businessMode} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-0">
          <HelpGuideDispatch searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="food" className="mt-0">
          <HelpGuideFood searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="medical" className="mt-0">
          <HelpGuideMedical searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="business-brain" className="mt-0">
          <HelpGuideBrain mode={businessMode} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="automations" className="mt-0">
          <HelpGuideWorkflows mode={businessMode} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <HelpGuideSettings searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}
