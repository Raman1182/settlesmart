"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function DashboardOverview() {
    const { balances } = useSettleSmart();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You Owe</CardTitle>
                    <ArrowDownLeft className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(balances.totalOwedByUser)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount to settle with others
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You are Owed</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(balances.totalOwedToUser)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount others need to settle with you
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
