import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 md:h-18 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover-lift transition-transform">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CloseLoop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/pricing" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              Pricing
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="shadow-sm">
                Start Free Trial
              </Button>
            </Link>
          </nav>

          <div className="flex md:hidden items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">
                Start
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Phone className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">CloseLoop</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <span className="text-border">•</span>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Log in
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CloseLoop. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
