import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, FileCode, Network, Users } from "lucide-react";
import type { RootCause } from "@shared/schema";

interface RootCausePanelProps {
  rootCauses: RootCause[];
}

export function RootCausePanel({ rootCauses }: RootCausePanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "timing":
        return Clock;
      case "dom":
        return FileCode;
      case "resource":
        return Network;
      case "concurrency":
        return Users;
      default:
        return AlertTriangle;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "timing":
        return "Timing Issue";
      case "dom":
        return "DOM Instability";
      case "resource":
        return "Resource Dependency";
      case "concurrency":
        return "Concurrency Issue";
      default:
        return "Unknown";
    }
  };

  if (!rootCauses || rootCauses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Root Cause Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No root causes identified yet. More execution data is needed for analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Root Cause Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rootCauses.map((cause, index) => {
          const Icon = getIcon(cause.type);
          return (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-md bg-muted/50"
              data-testid={`root-cause-${index}`}
            >
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-md bg-background flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{getTypeLabel(cause.type)}</h4>
                  <span className="text-sm text-muted-foreground">
                    {cause.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{cause.description}</p>
                <div className="relative">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${cause.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
