
"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftRight, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User } from "@/lib/types";

interface FriendWithBalance {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    initials: string;
    balance: number;
}


export default function FriendsPage() {
  const { users, currentUser, balances } = useSettleSmart();
  const [settleFriend, setSettleFriend] = useState<FriendWithBalance | null>(null);

  const friendsWithBalances = useMemo(() => {
    const friendMap: Map<string, FriendWithBalance> = new Map();

    // Initialize map with all known users first to get their full details
    users.forEach(u => {
        if (u.id !== currentUser.id) {
            friendMap.set(u.id, {
                id: u.id,
                name: u.name,
                email: u.email,
                avatar: u.avatar,
                initials: u.initials,
                balance: 0
            });
        }
    });
    
    balances.settlements.forEach(s => {
      let friend: FriendWithBalance | undefined;
      let friendId: string | undefined;

      // Determine who the friend is in this settlement
      if (s.from.id === currentUser.id) {
        friendId = s.to.id;
      } else if (s.to.id === currentUser.id) {
        friendId = s.from.id;
      }

      if (friendId) {
        friend = friendMap.get(friendId);

        // If friend doesn't exist (ad-hoc user), create a record for them
        if (!friend) {
            const participant = s.from.id === friendId ? s.from : s.to;
            friend = {
                id: participant.id,
                name: participant.name,
                initials: participant.name.charAt(0).toUpperCase(),
                balance: 0,
            };
            friendMap.set(friendId, friend);
        }

        // Update balance
        if (s.from.id === currentUser.id) {
          friend.balance -= s.amount; // You owe them
        } else {
          friend.balance += s.amount; // They owe you
        }
      }
    });

    return Array.from(friendMap.values())
      .filter(f => f.balance !== 0) // Only show friends with an outstanding balance
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  }, [users, currentUser, balances]);

  return (
    <>
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
                  <CardDescription>{friend.email || 'Ad-hoc friend'}</CardDescription>
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
                 <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={friend.balance === 0} onClick={() => setSettleFriend(friend)}>
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        Settle Up
                    </Button>
                 </AlertDialogTrigger>
                <div className="flex items-center text-xs text-muted-foreground gap-1 pt-2">
                    <Shield className="h-4 w-4 text-primary/50" />
                    <span>Trust Score: 88 (Reliable)</span>
                </div>
              </CardFooter>
            </Card>
          ))}
           {friendsWithBalances.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                    <h3 className="text-xl font-bold mb-2">All square!</h3>
                    <p className="mb-4">You have no outstanding balances with any friends.</p>
                </div>
            )}
        </div>
      </main>
    </div>
    <AlertDialog>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Settle with {settleFriend?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
                This will mark your balance of {formatCurrency(Math.abs(settleFriend?.balance || 0))} with {settleFriend?.name} as settled. This action assumes an offline payment was made.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm Settlement</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
