import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, LayoutDashboard, AlertCircle, HelpCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isAuthenticated = !loading && user;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center shadow-soft-lg">
        <CardHeader className="pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <CardDescription className="text-base">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {isAuthenticated ? (
            <>
              <Button asChild className="w-full" size="lg">
                <Link to="/app/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/app/help">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="w-full" size="lg">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Return to Home
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">
                  Log in
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
