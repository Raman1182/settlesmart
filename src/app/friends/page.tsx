
"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftRight, Loader2, MessageSquare, MoreVertical, ShieldCheck, Send } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TrustScoreIndicator } from "@/components/trust-score-indicator";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface FriendWithBalance {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    initials: string;
    balance: number;
    isRegistered: boolean;
}


export default function FriendsPage() {
  const { users, currentUser, balances, settleFriendDebt, isLoading } = useSettleSmart();
  const { toast } = useToast();
  const [settleFriend, setSettleFriend] = useState<FriendWithBalance | null>(null);
  const [messageFriend, setMessageFriend] = useState<FriendWithBalance | null>(null);
  const [isSettling, startSettleTransition] = useTransition();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  const friendsWithBalances = useMemo(() => {
    if (!currentUser) return [];
    
    const friendMap: Map<string, FriendWithBalance> = new Map();

    users.forEach(u => {
        if (u.id !== currentUser.id) {
            friendMap.set(u.id, {
                id: u.id,
                name: u.name,
                email: u.email,
                avatar: u.avatar,
                initials: u.initials,
                balance: 0,
                isRegistered: !!u.email,
            });
        }
    });
    
    balances.settlements.forEach(s => {
      let friend: FriendWithBalance | undefined;
      let friendId: string | undefined;

      if (s.from.id === currentUser.id) {
        friendId = s.to.id;
      } else if (s.to.id === currentUser.id) {
        friendId = s.from.id;
      }

      if (friendId) {
        friend = friendMap.get(friendId);

        if (!friend) {
            const participant = s.from.id === friendId ? s.from : s.to;
            friend = {
                id: participant.id,
                name: participant.name,
                initials: participant.name.charAt(0).toUpperCase(),
                balance: 0,
                isRegistered: !!(participant as User).email,
            };
            friendMap.set(friendId, friend);
        }

        if (s.from.id === currentUser.id) {
          friend.balance -= s.amount; 
        } else {
          friend.balance += s.amount; 
        }
      }
    });
    
    return Array.from(friendMap.values())
      .sort((a, b) => {
        const aHasBalance = Math.abs(a.balance) > 0.01;
        const bHasBalance = Math.abs(b.balance) > 0.01;
        if (aHasBalance && !bHasBalance) return -1;
        if (!aHasBalance && bHasBalance) return 1;
        return a.name.localeCompare(b.name);
      });

  }, [users, currentUser, balances]);
  
  const handleSettle = () => {
    if (!settleFriend) return;
    startSettleTransition(async () => {
        try {
            await settleFriendDebt(settleFriend.id);
            toast({
                title: `Settled with ${settleFriend.name}!`,
                description: "Your balance is now clear."
            });
            setSettleFriend(null);
        } catch(error: any) {
             toast({
                variant: "destructive",
                title: "Error settling up",
                description: error.message,
            });
        }
    });
  }

  const getFriendTrustScore = (balance: number) => {
    let score = 50; 
    
    if (balance > 0) {
      score -= Math.min(40, Math.log(balance + 1) * 5);
    }
    
    if (balance < 0) {
      score += Math.min(30, Math.log(Math.abs(balance) + 1) * 3);
    }

    return Math.max(0, Math.min(100, score));
  }
  
  const handleShowTrustScore = (friend: FriendWithBalance) => {
      const score = getFriendTrustScore(friend.balance);
      const scoreType = friend.isRegistered ? "Public" : "Personal";
      toast({
          title: `${friend.name}'s Trust Score`,
          description: `${scoreType} Trust Score is ${score.toFixed(0)}. This is calculated based on your shared financial history.`
      })
  }
  
  if (isLoading || !currentUser) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AlertDialog onOpenChange={(open) => {
        if (!open) {
            setSettleFriend(null);
            setMessageFriend(null);
        }
    }}>
      <div className="flex flex-col min-h-screen w-full">
        <Header pageTitle="Friends" />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Your Contacts</CardTitle>
                    <CardDescription>A list of all people you've interacted with.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {friendsWithBalances.map(friend => (
                        <div key={friend.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={friend.avatar} alt={friend.name} />
                                <AvatarFallback>{friend.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{friend.name}</p>
                                <p className={`text-sm ${friend.balance > 0.01 ? 'text-green-500' : friend.balance < -0.01 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {friend.balance > 0.01 ? `Owes you ${formatCurrency(Math.abs(friend.balance))}` : friend.balance < -0.01 ? `You owe ${formatCurrency(Math.abs(friend.balance))}` : 'Settled up'}
                                </p>
                            </div>
                             <div className="w-24">
                                <TrustScoreIndicator score={getFriendTrustScore(friend.balance)} />
                             </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem disabled={Math.abs(friend.balance) < 0.01} onSelect={() => setSettleFriend(friend)}>
                                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                                            Settle Up
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                     <AlertDialogTrigger asChild>
                                        <DropdownMenuItem disabled={!friend.isRegistered} onSelect={() => setMessageFriend(friend)}>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Message
                                        </DropdownMenuItem>
                                     </AlertDialogTrigger>
                                     <DropdownMenuItem onClick={() => handleShowTrustScore(friend)}>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        View Trust Score
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        ))}
                        {friendsWithBalances.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                                <p className="mb-4">Add expenses with new people to see them here.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>

       {/* This single AlertDialogContent is used for both Settle and Message actions */}
      <AlertDialogContent>
         {settleFriend ? (
            <>
                <AlertDialogHeader>
                    <AlertDialogTitle>Settle with {settleFriend.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will mark your balance of {formatCurrency(Math.abs(settleFriend.balance || 0))} with {settleFriend.name} as settled. This action assumes an offline payment was made and will remove the debt from the system.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettle} disabled={isSettling}>
                        {isSettling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Settlement
                    </AlertDialogAction>
                </AlertDialogFooter>
            </>
         ) : messageFriend ? (
             <>
                <AlertDialogHeader>
                    <AlertDialogTitle>Message {messageFriend.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Send a quick message or reminder. This functionality is for demonstration purposes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex w-full items-center space-x-2 py-4">
                    <Input id="message" placeholder="Type your message..." className="flex-1" />
                    <Button type="submit" size="icon" onClick={() => toast({ title: "Message sent! (demo)" })}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </>
         ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
