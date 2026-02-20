import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertCircle, AudioWaveform } from "lucide-react";
import { BRAND } from "@/config/brand";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Brand header */}
      <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
          <AudioWaveform className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">{BRAND.name}</span>
      </Link>

      <div className="max-w-md w-full text-center rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm shadow-soft-lg p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4 glow-primary-subtle">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-base text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/">
            <Button className="w-full" size="lg">
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
