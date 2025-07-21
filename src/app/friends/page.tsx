
"use client";

import { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeftRight, Loader2, MessageSquare, MoreVertical, ShieldCheck, Send, Plus, UserPlus, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User, Friendship } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TrustScoreIndicator } from "@/components/trust-score-indicator";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


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
  const { users, currentUser, balances, settleFriendDebt, isLoading, friendships, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, findUserById } = useSettleSmart();
  const { toast } = useToast();
  const [settleFriend, setSettleFriend] = useState<FriendWithBalance | null>(null);
  const [isSettling, startSettleTransition] = useTransition();
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  const friendsWithBalances = useMemo(() => {
    if (!currentUser) return [];

    const acceptedFriendIds = friendships
      .filter(f => f.status === 'accepted')
      .flatMap(f => f.userIds)
      .filter(id => id !== currentUser.id);
    
    const friendUsers = users.filter(u => acceptedFriendIds.includes(u.id));
    
    const friendMap: Map<string, FriendWithBalance> = new Map();
     friendUsers.forEach(u => {
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
      let friendId: string | undefined;
      if (s.from.id === currentUser.id) friendId = s.to.id;
      else if (s.to.id === currentUser.id) friendId = s.from.id;

      if (friendId && friendId !== currentUser.id) {
        let friend = friendMap.get(friendId);
        if (friend) {
          if (s.from.id === currentUser.id) friend.balance -= s.amount;
          else friend.balance += s.amount;
        }
      }
    });
    
    return Array.from(friendMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, currentUser, balances, friendships]);

  const pendingRequests = useMemo(() => {
    if (!currentUser) return [];
    return friendships.filter(f => f.status === 'pending' && f.requestedBy !== currentUser.id);
  }, [friendships, currentUser]);
  
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
    if (balance > 0) score -= Math.min(40, Math.log(balance + 1) * 5);
    if (balance < 0) score += Math.min(30, Math.log(Math.abs(balance) + 1) * 3);
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
  
  const handleAddFriend = async () => {
    if (!newFriendEmail.trim()) {
        toast({ variant: "destructive", title: "Email is required" });
        return;
    }
    try {
        await sendFriendRequest(newFriendEmail);
        toast({ title: "Friend Request Sent!", description: `Your request to ${newFriendEmail} has been sent.` });
        setIsAddFriendOpen(false);
        setNewFriendEmail("");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Could not send request", description: error.message });
    }
  };
  
  if (isLoading || !currentUser) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen w-full">
        <Header pageTitle="Friends" />
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-8">
            {pendingRequests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Requests</CardTitle>
                        <CardDescription>People who want to be your friend.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingRequests.map(req => {
                            const requestorId = req.userIds.find(id => id !== currentUser.id)!;
                            const requestor = findUserById(requestorId);
                            if (!requestor) return null;
                            return (
                                <div key={req.id} className="flex items-center justify-between gap-4 p-2 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={requestor.avatar} alt={requestor.name} />
                                            <AvatarFallback>{requestor.initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{requestor.name}</p>
                                            <p className="text-sm text-muted-foreground">{requestor.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="outline" onClick={() => acceptFriendRequest(req.id)}>
                                            <Check className="h-4 w-4 text-green-500" />
                                        </Button>
                                        <Button size="icon" variant="outline" onClick={() => rejectFriendRequest(req.id)}>
                                            <X className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Your Friends</CardTitle>
                        <CardDescription>Your accepted friends and contacts.</CardDescription>
                    </div>
                     <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                        <Button onClick={() => setIsAddFriendOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Friend
                        </Button>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add a Friend</DialogTitle>
                                <DialogDescription>
                                    Send a friend request by entering their email address.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label htmlFor="email">Friend's Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="friend@example.com"
                                    value={newFriendEmail}
                                    onChange={(e) => setNewFriendEmail(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFriend(); } }}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                <Button onClick={handleAddFriend}>Send Request</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                             <AlertDialog onOpenChange={(open) => { if (!open) setSettleFriend(null); }}>
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
                                        <DropdownMenuItem disabled={!friend.isRegistered} onSelect={() => router.push(`/chat/${friend.id}`)}>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleShowTrustScore(friend)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            View Trust Score
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    {settleFriend && (
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
                                    )}
                                </AlertDialogContent>
                             </AlertDialog>
                        </div>
                        ))}
                        {friendsWithBalances.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                                <p className="mb-4">Add your friends to start sharing expenses with them.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>
    </>
  );
}
