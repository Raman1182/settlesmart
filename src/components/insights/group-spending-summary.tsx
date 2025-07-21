
"use client";

import { useMemo } from 'react';
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from '../ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GroupSpendingSummary() {
    const { expenses, groups } = useSettleSmart();
    const router = useRouter();

    const groupSpending = useMemo(() => {
        const spending = groups.map(group => {
            const groupExpenses = expenses.filter(e => e.groupId === group.id);
            const total = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
            return {
                id: group.id,
                name: group.name,
                total,
            };
        }).sort((a,b) => b.total - a.total);

        const grandTotal = spending.reduce((sum, g) => sum + g.total, 0);

        return spending.map(g => ({
            ...g,
            percentage: grandTotal > 0 ? (g.total / grandTotal) * 100 : 0
        }));
    }, [expenses, groups]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Insights</CardTitle>
                <CardDescription>Which groups cost you the most?</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {groupSpending.slice(0, 3).map((g, index) => (
                        <div key={g.id} className="cursor-pointer" onClick={() => router.push(`/group/${g.id}`)}>
                            <div className="flex items-center justify-between mb-1">
                                <div className='flex items-center gap-2'>
                                    <Users className="h-4 w-4 text-muted-foreground"/>
                                    <span className="text-sm font-medium">{g.name}</span>
                                </div>
                                <span className="text-sm font-semibold">{formatCurrency(g.total)}</span>
                            </div>
                            <Progress value={g.percentage} indicatorClassName={`bg-[hsl(var(--chart-${(index % 5) + 1}))]`} />
                        </div>
                    ))}
                    {groupSpending.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No group spending to analyze yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
