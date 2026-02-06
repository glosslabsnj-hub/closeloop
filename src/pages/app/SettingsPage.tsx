/**
 * Settings Page - Minimal Account Management
 * 
 * Only account-related settings, AI config lives in Business Brain
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  ChevronRight,
  LogOut,
  CreditCard,
  User,
  Shield,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { PlanUpgradeCard } from "@/components/settings/PlanUpgradeCard";

export default function SettingsPage() {
  const { user, signOut, tenant } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Render section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Account Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Password</p>
                      <p className="font-medium">••••••••••</p>
                    </div>
                    <Button variant="outline" size="sm">Change</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">(555) 123-4567</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "billing":
        return <PlanUpgradeCard />;

      case "security":
        return (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Active Sessions</p>
                      <p className="text-sm text-muted-foreground">Manage your logged-in devices</p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Overview mode
  if (!activeSection) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        {/* Account Section */}
        <div>
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
            Account
          </h2>
          <Card>
            <div className="divide-y divide-border/50">
              {[
                { id: "account", icon: User, label: "Email", value: user?.email },
                { id: "account", icon: Shield, label: "Password", value: "••••••••••" },
                { id: "account", icon: User, label: "Phone", value: "(555) 123-4567" },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Edit</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Billing Section */}
        <div>
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
            Billing
          </h2>
          <Card>
            <div className="divide-y divide-border/50">
              <button
                onClick={() => setActiveSection("billing")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-medium">Pro - $99/month</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  <p className="font-medium">February 15, 2025</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection("billing")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">•••• 4242</p>
                </div>
                <span className="text-xs text-muted-foreground">Update</span>
              </button>
            </div>
          </Card>
        </div>

        {/* AI Settings Redirect */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <Link 
              to="/app/business-brain" 
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Looking for AI settings?</p>
                  <p className="text-sm text-muted-foreground">Go to Business Brain</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign Out */}
        <Button 
          variant="outline" 
          onClick={signOut}
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  // Detail view
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setActiveSection(null)}
        className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Settings
      </Button>

      {renderSectionContent()}
    </div>
  );
}
