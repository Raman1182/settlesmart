
"use client";

import { useMemo } from "react";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Target, Info } from "lucide-react";

const MONTHLY_BUDGET_GOAL = 1000; // Hardcoded for now

export function BudgetGoals() {
  const { expenses } = useSettleSmart();

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses
      .filter(expense => new Date(expense.date) >= startOfMonth)
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);
  
  const progress = Math.min((currentMonthSpending / MONTHLY_BUDGET_GOAL) * 100, 100);
  const remaining = Math.max(0, MONTHLY_BUDGET_GOAL - currentMonthSpending);
  const overBudget = currentMonthSpending > MONTHLY_BUDGET_GOAL;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Monthly Budget</CardTitle>
        <CardDescription>
          Tracking your spending against this month's goal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 text-center">
                <Target className="h-10 w-10 text-primary" />
                <div>
                    <p className="text-2xl font-bold">{formatCurrency(MONTHLY_BUDGET_GOAL)}</p>
                    <p className="text-sm text-muted-foreground">Monthly Goal</p>
                </div>
            </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Spending Progress</span>
              <span className={`font-semibold ${overBudget ? 'text-destructive' : 'text-foreground'}`}>
                {progress.toFixed(0)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center text-xs pt-1">
                <span className={`font-bold ${overBudget ? 'text-destructive' : 'text-green-500'}`}>
                    {overBudget 
                        ? `${formatCurrency(Math.abs(remaining))} over budget` 
                        : `${formatCurrency(remaining)} left to spend`
                    }
                </span>
            </div>
          </div>
          {overBudget && (
            <div className="flex items-start gap-2 text-sm text-destructive/80 p-3 bg-destructive/10 rounded-lg">
                <Info className="h-4 w-4 mt-0.5" />
                <p>You've exceeded your monthly budget. Review your expenses to find savings opportunities.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
