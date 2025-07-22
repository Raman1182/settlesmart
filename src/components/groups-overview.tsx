
"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Users, MoreVertical } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export function GroupsOverview() {
    const { groups, balances, currentUser } = useSettleSmart();
    const router = useRouter();

    const getGroupBalance = (groupId: string) => {
        if (!currentUser) return 0;
        let netBalance = 0;
        // This is a simplified logic. For a real app, you'd iterate through group-specific expenses.
        balances.settlements.forEach(s => {
            // A proper check would be to see if the expense that created the settlement belongs to this group.
            // This is a placeholder logic.
            const isRelatedToGroup = true; // Placeholder
            if(isRelatedToGroup) {
                if(s.to.id === currentUser.id) netBalance += s.amount;
                if(s.from.id === currentUser.id) netBalance -= s.amount;
            }
        });
        return netBalance;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Groups</CardTitle>
                <CardDescription>A summary of your most active groups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {groups.slice(0, 3).map(group => {
                    const balance = getGroupBalance(group.id);
                    return (
                        <div key={group.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{group.name}</p>
                                    <p className={`text-xs font-semibold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {balance > 0 ? `You're owed` : balance < 0 ? 'You owe' : 'Settled up'}
                                    </p>
                                </div>
                            </div>
                           <Button variant="ghost" size="icon" onClick={() => router.push(`/group/${group.id}`)}>
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                        </div>
                    )
                })}
                 {groups.length === 0 && (
                     <div className="text-center text-muted-foreground py-4">
                        No groups yet. Create one to get started!
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
