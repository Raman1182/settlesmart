"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function DashboardOverview() {
    const { balances, expenses, currentUser } = useSettleSmart();

    const totalSpending = expenses
        .filter(e => e.paidById === currentUser.id)
        .reduce((sum, exp) => sum + exp.amount, 0);

    const netBalance = balances.totalOwedToUser - balances.totalOwedByUser;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You Owe</CardTitle>
                    <ArrowDownLeft className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatCurrency(balances.totalOwedByUser)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount to settle with others.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">You are Owed</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">{formatCurrency(balances.totalOwedToUser)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total amount others need to pay you.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {formatCurrency(netBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Your overall financial position.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Your Total Spending</CardTitle>
                    <div className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalSpending)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total you have paid for in all groups.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
