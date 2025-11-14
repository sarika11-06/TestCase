import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  value: number;
  label: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function ProgressIndicator({ value, label, variant = "default" }: ProgressIndicatorProps) {
  const getColor = () => {
    if (variant === "success") return "bg-green-600";
    if (variant === "warning") return "bg-yellow-600";
    if (variant === "danger") return "bg-red-600";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="relative">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
}

export function CircularProgress({ value, size = 100 }: CircularProgressProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 75) return "text-red-600";
    if (value >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">Flakiness</span>
      </div>
    </div>
  );
}
