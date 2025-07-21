
"use client";

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function GroupStats({ groupId }: { groupId: string }) {
    const { expenses, findUserById } = useSettleSmart();

    const groupExpenses = useMemo(() => {
        return expenses.filter(e => e.groupId === groupId);
    }, [expenses, groupId]);

    const contributionData = useMemo(() => {
        const contributions: { [key: string]: number } = {};
        groupExpenses.forEach(expense => {
            if (!contributions[expense.paidById]) {
                contributions[expense.paidById] = 0;
            }
            contributions[expense.paidById] += expense.amount;
        });

        return Object.entries(contributions).map(([userId, amount]) => ({
            name: findUserById(userId)?.name || 'Unknown',
            total: amount
        })).sort((a, b) => b.total - a.total);
    }, [groupExpenses, findUserById]);
    
    const chartConfig = contributionData.reduce((acc, item, index) => {
        acc[item.name] = {
            label: item.name,
            color: COLORS[index % COLORS.length],
        };
        return acc;
    }, {} as any);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Statistics</CardTitle>
                <CardDescription>A breakdown of who has contributed the most to this group's expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                {contributionData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <BarChart layout="vertical" data={contributionData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    width={80}
                                 />
                                <ChartTooltip
                                    cursor={{fill: 'hsl(var(--muted) / 0.5)'}}
                                    content={<ChartTooltipContent 
                                        formatter={(value) => formatCurrency(Number(value))}
                                        indicator="dot"
                                    />}
                                />
                                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                     {contributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] items-center justify-center text-center text-muted-foreground">
                        <p>No statistical data available yet. Add some expenses!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
