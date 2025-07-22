
"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowDown, ArrowUp, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function DashboardOverview() {
    const { balances } = useSettleSmart();

    const netBalance = balances.totalOwedToUser - balances.totalOwedByUser;

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
                <CardTitle>Financial Snapshot</CardTitle>
                <CardDescription>
                    Your current financial position across all groups.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                <div className="flex flex-col gap-1 items-center md:items-start p-4 rounded-lg bg-destructive/10">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <ArrowDown className="h-4 w-4 text-destructive"/>
                        You Owe
                    </div>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(balances.totalOwedByUser)}</div>
                </div>

                <div className="flex flex-col gap-1 items-center md:items-start p-4 rounded-lg bg-green-500/10">
                     <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <ArrowUp className="h-4 w-4 text-green-500"/>
                        You are Owed
                    </div>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(balances.totalOwedToUser)}</div>
                </div>

                 <div className="flex flex-col gap-1 items-center md:items-start p-4 rounded-lg bg-accent/50">
                     <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Scale className="h-4 w-4"/>
                        Net Balance
                    </div>
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-500' : 'text-destructive'}`}>{formatCurrency(netBalance)}</div>
                </div>
            </CardContent>
        </Card>
    );
}
