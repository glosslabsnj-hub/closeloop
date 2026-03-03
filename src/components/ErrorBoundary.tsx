import React from "react";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
  /** User-friendly context about what section failed, e.g. "loading your bookings" */
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const contextMsg = this.props.context
        ? `We had trouble ${this.props.context}. This is usually temporary.`
        : "Something didn't load correctly. This is usually temporary.";

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-xl border border-border/40 bg-muted/30 p-8 text-center backdrop-blur-sm",
            this.props.className
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground">
              {contextMsg}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={this.resetErrorBoundary}>
              Try again
            </Button>
            <a
              href="/app/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
