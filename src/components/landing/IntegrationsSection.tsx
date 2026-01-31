import { Check, Database, Webhook, Mail, Smartphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function IntegrationsSection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Integrations
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Works with what you have
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Use CloseLoop as your main system, or push data to your existing tools
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Option 1: Use CloseLoop */}
            <div className="p-8 rounded-2xl bg-card border-2 border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl">Use CloseLoop</h3>
              </div>
              <p className="text-muted-foreground mb-5">
                Manage bookings, jobs, and orders in one place. No extra software needed.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Built-in calendar & scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Dispatch queue & job tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Customer database & history</span>
                </li>
              </ul>
            </div>
            
            {/* Option 2: Push to existing tools */}
            <div className="p-8 rounded-2xl bg-card border-2 border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Webhook className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl">Push to Your System</h3>
              </div>
              <p className="text-muted-foreground mb-5">
                Send captured data directly to your CRM, scheduler, or POS system.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Webhooks to any endpoint</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Google Sheets export</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>Email & SMS notifications</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Delivery methods */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-12 pt-10 border-t">
            <div className="text-center group cursor-default">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <Webhook className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Webhooks</span>
            </div>
            <div className="text-center group cursor-default">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <Mail className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Email</span>
            </div>
            <div className="text-center group cursor-default">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <Smartphone className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">SMS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
