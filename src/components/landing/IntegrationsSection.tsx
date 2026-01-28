import { Check, Database, Webhook, Mail, Smartphone } from "lucide-react";

export function IntegrationsSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Works with what you have
            </h2>
            <p className="text-lg text-muted-foreground">
              Use CloseLoop as your main system, or push data to your existing tools
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Option 1: Use CloseLoop */}
            <div className="p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Use CloseLoop</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Manage all your bookings, jobs, and orders in one place. No extra software needed.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Built-in calendar & scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Dispatch queue & job tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Customer database & history
                </li>
              </ul>
            </div>
            
            {/* Option 2: Push to existing tools */}
            <div className="p-6 rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Webhook className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Push to Your System</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Send captured data directly to your CRM, scheduler, or POS system.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Webhook delivery to any endpoint
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Google Sheets export
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Email & SMS notifications
                </li>
              </ul>
            </div>
          </div>
          
          {/* Delivery methods icons */}
          <div className="flex justify-center gap-8 mt-10 pt-8 border-t">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <Webhook className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Webhooks</span>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Email</span>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">SMS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
