
"use client";

import { useMemo } from "react";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Target, Info, MinusCircle, CheckCircle2 } from "lucide-react";

const MONTHLY_BUDGET_GOAL = 1000; // Hardcoded for now. In the future, this could come from user settings.

export function BudgetGoals() {
  const { expenses, currentUser } = useSettleSmart();

  const currentMonthSpending = useMemo(() => {
    if (!currentUser) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses
      .filter(expense => {
          const isParticipant = expense.splitWith.includes(currentUser.id);
          const expenseDate = new Date(expense.date);
          return isParticipant && expenseDate >= startOfMonth;
      })
      .reduce((total, expense) => {
          if (expense.splitType === 'equally') {
            return total + (expense.amount / expense.splitWith.length);
          } else {
            const userSplit = expense.unequalSplits?.find(s => s.participantId === currentUser.id);
            return total + (userSplit?.amount || 0);
          }
      }, 0);
  }, [expenses, currentUser]);
  
  const progress = Math.min((currentMonthSpending / MONTHLY_BUDGET_GOAL) * 100, 100);
  const remaining = Math.max(0, MONTHLY_BUDGET_GOAL - currentMonthSpending);
  const overBudgetBy = currentMonthSpending > MONTHLY_BUDGET_GOAL ? currentMonthSpending - MONTHLY_BUDGET_GOAL : 0;
  const isOverBudget = overBudgetBy > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Monthly Budget Tracker</CardTitle>
        <CardDescription>
          Tracking your personal spending against this month's goal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
            <div className="flex items-center justify-center gap-6 text-center p-4 bg-muted/50 rounded-lg">
                <Target className="h-10 w-10 text-primary" />
                <div>
                    <p className="text-2xl font-bold">{formatCurrency(MONTHLY_BUDGET_GOAL)}</p>
                    <p className="text-sm text-muted-foreground">Your Monthly Goal</p>
                </div>
            </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Current Spending</span>
              <span className={`font-semibold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                {formatCurrency(currentMonthSpending)}
              </span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName={isOverBudget ? "bg-destructive" : "bg-primary"}/>
            <div className="flex justify-between items-center text-xs pt-1">
                <span className={`font-bold ${isOverBudget ? 'text-destructive' : 'text-green-500'}`}>
                    {isOverBudget 
                        ? (
                            <div className="flex items-center gap-1">
                                <MinusCircle className="h-3 w-3" />
                                <span>{formatCurrency(overBudgetBy)} over budget</span>
                            </div>
                        )
                        : (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{formatCurrency(remaining)} left to spend</span>
                            </div>
                        )
                    }
                </span>
                 <span className="font-semibold">{progress.toFixed(0)}% Used</span>
            </div>
          </div>
          {isOverBudget && (
            <div className="flex items-start gap-3 text-sm text-destructive/90 p-3 bg-destructive/10 rounded-lg">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>You've exceeded your monthly budget. Review your expenses to find savings opportunities.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
