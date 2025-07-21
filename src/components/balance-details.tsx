"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftRight, ArrowRight, User } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

export function BalanceDetails() {
    const { balances, currentUser } = useSettleSmart();

    const debtsOwedToUser = balances.settlements.filter(s => s.to.id === currentUser.id);
    const debtsOwedByUser = balances.settlements.filter(s => s.from.id === currentUser.id);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Balance Details</CardTitle>
                <CardDescription>A summary of who owes who.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px]">
                    <div className="space-y-4">
                        {debtsOwedToUser.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">You are owed:</h3>
                                <div className="space-y-3">
                                    {debtsOwedToUser.map((s, i) => (
                                        <div key={`owed-to-${i}`} className="flex items-center">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={s.from.avatar} alt={s.from.name} />
                                                <AvatarFallback>{s.from.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">{s.from.name} owes you</p>
                                            </div>
                                            <div className="ml-auto font-medium text-emerald-500">{formatCurrency(s.amount)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {debtsOwedByUser.length > 0 && (
                             <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">You owe:</h3>
                                <div className="space-y-3">
                                    {debtsOwedByUser.map((s, i) => (
                                        <div key={`owed-by-${i}`} className="flex items-center">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={s.to.avatar} alt={s.to.name} />
                                                <AvatarFallback>{s.to.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">You owe {s.to.name}</p>
                                            </div>
                                            <div className="ml-auto font-medium text-destructive">{formatCurrency(s.amount)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         )}

                         {balances.settlements.length === 0 && (
                              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                <ArrowLeftRight className="h-8 w-8 mb-2" />
                                <p>All settled up!</p>
                                <p className="text-xs">No one owes anyone anything right now.</p>
                            </div>
                         )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
