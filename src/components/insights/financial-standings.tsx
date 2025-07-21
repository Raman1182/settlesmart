
"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

export function FinancialStandings() {
    const { balances, currentUser } = useSettleSmart();

    const debtsOwedToUser = balances.settlements
        .filter(s => s.to.id === currentUser?.id)
        .sort((a,b) => b.amount - a.amount);

    const debtsOwedByUser = balances.settlements
        .filter(s => s.from.id === currentUser?.id)
        .sort((a,b) => b.amount - a.amount);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Contributors & Moochers</CardTitle>
                <CardDescription>Who you owe most and who owes you most right now.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="flex items-center text-sm font-medium text-destructive mb-3">
                        <ArrowDown className="mr-2 h-4 w-4"/>
                        Who You Owe Most
                    </h3>
                    <div className="space-y-4">
                        {debtsOwedByUser.slice(0, 3).map((s, i) => (
                             <div key={`owed-by-${i}`} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={s.to.avatar} alt={s.to.name} />
                                    <AvatarFallback>{s.to.initials}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{s.to.name}</p>
                                </div>
                                <div className="ml-auto font-medium">{formatCurrency(s.amount)}</div>
                            </div>
                        ))}
                         {debtsOwedByUser.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">You don't owe anyone. Nice!</p>}
                    </div>
                </div>
                 <div>
                    <h3 className="flex items-center text-sm font-medium text-green-500 mb-3">
                        <ArrowUp className="mr-2 h-4 w-4"/>
                        Who Owes You Most
                    </h3>
                    <div className="space-y-4">
                        {debtsOwedToUser.slice(0, 3).map((s, i) => (
                            <div key={`owed-to-${i}`} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={s.from.avatar} alt={s.from.name} />
                                    <AvatarFallback>{s.from.initials}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{s.from.name}</p>
                                </div>
                                <div className="ml-auto font-medium">{formatCurrency(s.amount)}</div>
                            </div>
                        ))}
                         {debtsOwedToUser.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No one owes you. All settled!</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
