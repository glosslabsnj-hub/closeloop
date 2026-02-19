import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "lucide-react";
import { BRAND } from "@/config/brand";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 md:h-18 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover-lift transition-transform">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm">
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
              <Button size="sm" className="shadow-sm">
                Get Started
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
      <footer className="border-t py-12 md:py-16 bg-card/50">
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
                <li><span>About</span></li>
                <li><span>Blog</span></li>
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
                <li><span>Privacy</span></li>
                <li><span>Terms</span></li>
                <li><span>Security</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
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
