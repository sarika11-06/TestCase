import { Badge } from "@/components/ui/badge";

type TestStatus = "passed" | "failed" | "flaky" | "resolved";

interface StatusBadgeProps {
  status: TestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    passed: { label: "Passed", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    flaky: { label: "Flaky", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
    resolved: { label: "Resolved", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  };

  const { label, className } = config[status];

  return (
    <Badge className={className} data-testid={`badge-status-${status}`}>
      {label}
    </Badge>
  );
}
