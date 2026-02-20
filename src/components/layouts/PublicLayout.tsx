import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AudioWaveform, Menu, X } from "lucide-react";
import { BRAND } from "@/config/brand";

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on navigation
  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
        <div className="container flex h-16 md:h-[68px] items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover-lift transition-transform">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_-4px_hsl(230_70%_62%/0.3)]">
              <AudioWaveform className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{BRAND.name}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">

            <Link
              to="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/agencies"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Partners
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="shadow-[0_0_20px_-6px_hsl(230_70%_62%/0.3)]">
                Get Started
              </Button>
            </Link>
          </nav>

          {/* Mobile: hamburger + CTA */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/signup">
              <Button size="sm">
                Start
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-lg">
            <nav className="container py-4 flex flex-col gap-1">
              <a
                href="#features"
                onClick={handleNavClick}
                className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                Features
              </a>
              <Link
                to="/pricing"
                onClick={handleNavClick}
                className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/agencies"
                onClick={handleNavClick}
                className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                Partners
              </Link>
              <div className="border-t my-2" />
              <Link
                to="/login"
                onClick={handleNavClick}
                className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                Log in
              </Link>
              <Link to="/signup" onClick={handleNavClick} className="mt-1">
                <Button className="w-full">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 py-12 md:py-16 bg-card/20 backdrop-blur-sm">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Product */}
            <div>
              <p className="text-sm font-semibold mb-4">Product</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Demo</a></li>
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-sm font-semibold mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span className="cursor-default">About</span></li>
                <li><span className="cursor-default">Blog</span></li>
                <li><Link to="/agencies" className="hover:text-foreground transition-colors">Partner Program</Link></li>
              </ul>
            </div>
            {/* Resources */}
            <div>
              <p className="text-sm font-semibold mb-4">Resources</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Log In</Link></li>
                <li><Link to="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <p className="text-sm font-semibold mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span className="cursor-default">Privacy</span></li>
                <li><span className="cursor-default">Terms</span></li>
                <li><span className="cursor-default">Security</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/20">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-[0_0_16px_-4px_hsl(230_70%_62%/0.3)]">
                <AudioWaveform className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">{BRAND.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
