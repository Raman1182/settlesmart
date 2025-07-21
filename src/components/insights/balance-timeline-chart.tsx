
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useSettleSmart } from "@/context/settle-smart-context"
import { format, startOfDay, subDays } from "date-fns"

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

export function BalanceTimelineChart() {
    const { expenses, currentUser, calculateSettlements, simplifyDebts, findUserById } = useSettleSmart();

    const chartData = React.useMemo(() => {
        if (!currentUser) return [];

        const data: { date: string; balance: number }[] = [];
        const today = startOfDay(new Date());

        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const expensesUpToDate = expenses.filter(e => new Date(e.date) <= date);
            
            const allParticipantIds = [...new Set(expensesUpToDate.flatMap(e => [e.paidById, ...e.splitWith]))];
            const userBalances = calculateSettlements(expensesUpToDate, allParticipantIds);
            
            const settlements = simplifyDebts(userBalances);

            const totalOwedToUser = settlements.filter(s => s.to === currentUser.id).reduce((sum, s) => sum + s.amount, 0);
            const totalOwedByUser = settlements.filter(s => s.from === currentUser.id).reduce((sum, s) => sum + s.amount, 0);
            const netBalance = totalOwedToUser - totalOwedByUser;
            
            data.push({
                date: format(date, "MMM d"),
                balance: netBalance
            });
        }

        return data;
    }, [expenses, currentUser, calculateSettlements, simplifyDebts]);
    
    const chartConfig = {
        balance: {
            label: "Net Balance",
            color: "hsl(var(--chart-1))",
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Debt Timeline</CardTitle>
                <CardDescription>Your net balance (owed to you - what you owe) over the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
                        />
                         <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => formatCurrency(Number(value))}
                         />
                        <ChartTooltip
                            cursor={true}
                            content={<ChartTooltipContent 
                                formatter={(value) => formatCurrency(Number(value))}
                                indicator="dot"
                            />}
                        />
                        <defs>
                            <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <Area
                            dataKey="balance"
                            type="natural"
                            fill="url(#fillBalance)"
                            stroke="var(--color-balance)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
