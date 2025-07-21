"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useSettleSmart } from "@/context/settle-smart-context"
import { format, startOfMonth, subMonths } from "date-fns"

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

export function SpendingOverTimeChart() {
    const { expenses } = useSettleSmart();

    const chartData = React.useMemo(() => {
        const now = new Date();
        // Initialize data for the last 6 months
        const data = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(now, 5 - i);
            return {
                month: format(startOfMonth(date), "MMM"),
                total: 0,
            };
        });

        // Aggregate expenses by month
        expenses.forEach(expense => {
            const expenseMonth = format(startOfMonth(new Date(expense.date)), "MMM");
            const monthData = data.find(d => d.month === expenseMonth);
            if (monthData) {
                monthData.total += expense.amount;
            }
        });

        return data;
    }, [expenses]);
    
    const chartConfig = {
        total: {
            label: "Total Spending",
            color: "hsl(var(--chart-1))",
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>Total expenses across all groups for the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                         <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => formatCurrency(Number(value) / 1000) + 'k'}
                         />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value) => formatCurrency(Number(value))}
                                indicator="dot"
                            />}
                        />
                        <Bar
                            dataKey="total"
                            fill="var(--color-total)"
                            radius={8}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
