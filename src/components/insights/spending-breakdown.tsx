
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"
import { useSettleSmart } from "@/context/settle-smart-context"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "../ui/badge"

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function SpendingBreakdown() {
    const { expenses, currentUser } = useSettleSmart();

    const { chartData, totalPersonal, totalGroup } = React.useMemo(() => {
        if (!currentUser) return { chartData: [], totalPersonal: 0, totalGroup: 0 };

        const categorySpending: Record<string, number> = {};
        let personalSpend = 0;
        let groupSpend = 0;

        expenses.forEach(expense => {
            const isParticipant = expense.splitWith.includes(currentUser.id);
            if (!isParticipant) return;

            const category = expense.category || 'Other';
            if (!categorySpending[category]) {
                categorySpending[category] = 0;
            }
            
            let userShare = 0;
            if (expense.splitType === 'equally') {
                userShare = expense.amount / expense.splitWith.length;
            } else {
                const userSplit = expense.unequalSplits?.find(s => s.participantId === currentUser.id);
                userShare = userSplit?.amount || 0;
            }

            categorySpending[category] += userShare;

            if (expense.groupId) {
                groupSpend += userShare;
            } else {
                personalSpend += userShare;
            }
        });

        const data = Object.entries(categorySpending).map(([category, amount]) => ({
            category,
            amount,
        })).sort((a,b) => b.amount - a.amount);
        
        return { chartData: data, totalPersonal: personalSpend, totalGroup: groupSpend };

    }, [expenses, currentUser]);

    const chartConfig = chartData.reduce((acc, item, index) => {
        acc[item.category] = {
            label: item.category,
            color: COLORS[index % COLORS.length],
        };
        return acc;
    }, {} as any);

    const totalSpending = totalPersonal + totalGroup;

    return (
        <Card className="flex flex-col h-full lg:col-span-1">
            <CardHeader>
                <CardTitle>Spending Breakdown</CardTitle>
                <CardDescription>Your personal share of all expenses, categorized.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 flex flex-col justify-between">
                {chartData.length > 0 ? (
                    <>
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[250px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent 
                                    formatter={(value, name) => `${name}: ${formatCurrency(Number(value))}`}
                                    hideLabel 
                                />}
                            />
                            <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={60} strokeWidth={5}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Personal Spending</span>
                            <span className="font-semibold">{formatCurrency(totalPersonal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Group Spending</span>
                            <span className="font-semibold">{formatCurrency(totalGroup)}</span>
                        </div>
                         <div className="flex items-center justify-between border-t pt-3 mt-2">
                            <span className="font-bold">Total Spending</span>
                            <span className="font-bold text-primary">{formatCurrency(totalSpending)}</span>
                        </div>
                    </div>
                    </>
                ) : (
                     <div className="flex h-full items-center justify-center text-center text-muted-foreground p-8">
                        <p>No spending data available. Add an expense to see your breakdown.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
