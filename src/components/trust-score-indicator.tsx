
"use client";

import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreIndicatorProps {
  score: number;
}

export function TrustScoreIndicator({ score }: TrustScoreIndicatorProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Highly Trusted";
    if (s >= 50) return "Reliable";
    return "Needs Improvement";
  };

  return (
     <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full text-left">
           <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Trust Score</span>
                    <span className="font-semibold">{getScoreLabel(score)}</span>
                </div>
                <Progress value={score} className="h-1.5" indicatorClassName={getScoreColor(score)} />
            </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This score reflects financial reliability. Higher is better!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// We need to allow custom class for the indicator in the Progress component
declare module "@/components/ui/progress" {
    interface ProgressProps {
        indicatorClassName?: string;
    }
}
