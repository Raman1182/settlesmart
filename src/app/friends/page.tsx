
"use client";

import { useMemo } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftRight, Shield } from "lucide-react";

export default function FriendsPage() {
  const { users, currentUser, balances } = useSettleSmart();

  const friendsWithBalances = useMemo(() => {
    const friendBalances: { [key: string]: number } = {};

    balances.settlements.forEach(s => {
      if (s.from.id === currentUser.id) {
        if (!friendBalances[s.to.id]) friendBalances[s.to.id] = 0;
        friendBalances[s.to.id] -= s.amount;
      }
      if (s.to.id === currentUser.id) {
        if (!friendBalances[s.from.id]) friendBalances[s.from.id] = 0;
        friendBalances[s.from.id] += s.amount;
      }
    });

    return users
      .filter(u => u.id !== currentUser.id)
      .map(u => ({
        ...u,
        balance: friendBalances[u.id] || 0
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  }, [users, currentUser, balances]);

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header pageTitle="Friends" />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {friendsWithBalances.map(friend => (
            <Card key={friend.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback>{friend.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{friend.name}</CardTitle>
                  <CardDescription>{friend.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 text-center">
                 <div className={`text-2xl font-bold ${friend.balance > 0 ? 'text-green-500' : friend.balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                   {formatCurrency(Math.abs(friend.balance))}
                 </div>
                 <div className="text-sm text-muted-foreground">
                    {friend.balance > 0 ? `owes you` : friend.balance < 0 ? `you owe` : 'Settled up'}
                 </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                 <Button className="w-full" disabled={friend.balance === 0}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Settle Up
                </Button>
                <div className="flex items-center text-xs text-muted-foreground gap-1 pt-2">
                    <Shield className="h-4 w-4 text-primary/50" />
                    <span>Trust Score: 88 (Reliable)</span>
                </div>
              </CardFooter>
            </Card>
          ))}
           {friendsWithBalances.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                    <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                    <p className="mb-4">Add expenses with people to see them here.</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
