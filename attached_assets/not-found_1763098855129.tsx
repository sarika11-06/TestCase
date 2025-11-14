import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link href="/">
        <Button data-testid="button-home">
          <Home className="h-4 w-4 mr-2" />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
