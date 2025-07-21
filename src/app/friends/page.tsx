
"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, UserPlus, Check, X, UserMinus, MessageSquare, MoreVertical, Shield, History } from "lucide-react";
import type { User, Friendship, Expense } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TrustScoreIndicator } from "@/components/trust-score-indicator";
import { formatCurrency, cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";


export default function FriendsPage() {
  const { 
    users, 
    currentUser, 
    isAuthLoading, 
    friendships, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest,
    removeFriend,
    settleFriendDebt,
    chats,
    expenses,
    findUserById,
    calculateUserTrustScore,
  } = useSettleSmart();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, startProcessingTransition] = useTransition();
  const [selectedFriendForScore, setSelectedFriendForScore] = useState<User | null>(null);
  const [selectedFriendForHistory, setSelectedFriendForHistory] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isAuthLoading, currentUser, router]);

  const { friends, friendRequests, otherUsers, sentRequests } = useMemo(() => {
    if (!currentUser) return { friends: [], friendRequests: [], otherUsers: [], sentRequests: new Set() };

    const currentFriends: User[] = [];
    const requests: { friendship: Friendship, user: User }[] = [];
    const myFriendshipIds = new Set<string>();
    const mySentRequests = new Set<string>();

    friendships.forEach(f => {
      if (f.status !== 'accepted' && f.status !== 'pending') return;
      const friendId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
      const user = users.find(u => u.id === friendId);
      
      if (!user) return;

      if (f.status === 'accepted') {
        currentFriends.push(user);
        myFriendshipIds.add(user.id);
      } else if (f.status === 'pending') {
          if (f.receiverId === currentUser.id) {
            requests.push({ friendship: f, user });
          } else if (f.requesterId === currentUser.id) {
            mySentRequests.add(f.receiverId);
          }
      }
    });

    const nonFriendUsers = users.filter(u => 
        u.id !== currentUser.id && 
        !myFriendshipIds.has(u.id) &&
        !requests.some(r => r.user.id === u.id) &&
        !u.email.endsWith('@adhoc.settlesmart.app') // Exclude ad-hoc users from discover
    );

    return { friends: currentFriends, friendRequests: requests, otherUsers: nonFriendUsers, sentRequests: mySentRequests };
  }, [users, currentUser, friendships]);
  
  const handleSendRequest = (receiverId: string) => {
    startProcessingTransition(async () => {
      try {
        await sendFriendRequest(receiverId);
        toast({ title: "Request sent!", description: "They better say yes." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Yikes, an error.", description: "Couldn't send the request. Maybe try again?" });
      }
    });
  };

  const handleAcceptRequest = (friendshipId: string) => {
    startProcessingTransition(async () => {
      try {
        await acceptFriendRequest(friendshipId);
        toast({ title: "It's official!", description: "You're now friends. Don't be weird about it." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error accepting", description: "Something went wrong. The friendship remains in limbo." });
      }
    });
  };

  const handleDeclineRequest = (friendshipId: string) => {
     startProcessingTransition(async () => {
      try {
        await declineFriendRequest(friendshipId);
        toast({ title: "Request declined.", description: "Maybe it wasn't meant to be." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error declining", description: "Could not decline. Awkward." });
      }
    });
  };

  const handleRemoveFriend = (friendId: string) => {
     startProcessingTransition(async () => {
      try {
        await removeFriend(friendId);
        toast({ title: "Friend removed.", description: "It's okay, people grow apart." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Can't unfriend rn.", description: "The system wants you to stay friends. For now." });
      }
    });
  }

  const TransactionHistoryDialog = () => {
    const friend = selectedFriendForHistory;
    if (!friend || !currentUser) return null;

     const { netBalance, transactionHistory } = useMemo(() => {
        let balance = 0;
        const history: Expense[] = [];
        
        expenses.forEach(e => {
            const participants = new Set(e.splitWith);
            if (!e.groupId && participants.has(currentUser.id) && participants.has(friend.id) && participants.size === 2) {
                history.push(e);
                if (e.status === 'unsettled') {
                    const amountPerPerson = e.amount / 2;
                    if (e.paidById === currentUser.id) {
                        balance += amountPerPerson;
                    } else {
                        balance -= amountPerPerson;
                    }
                }
            }
        });
        
        history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { netBalance: balance, transactionHistory: history };

    }, [currentUser, friend, expenses]);

    const handleSettle = async () => {
      if (!friend) return;
        await settleFriendDebt(friend.id);
        setSelectedFriendForHistory(null);
        toast({ title: "All settled up!", description: `Your debts with ${friend.name} are now even stevens.`})
    }
    const isSettled = Math.abs(netBalance) < 0.01;

    return (
        <Dialog open={!!selectedFriendForHistory} onOpenChange={(open) => !open && setSelectedFriendForHistory(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>History with {friend.name}</DialogTitle>
                    <DialogDescription>
                         {isSettled && "You two are all settled up! High five."}
                         {!isSettled && netBalance > 0 && `${friend.name} owes you ${formatCurrency(netBalance)}`}
                         {!isSettled && netBalance < 0 && `You owe ${friend.name} ${formatCurrency(Math.abs(netBalance))}`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="pr-4 space-y-2">
                    {transactionHistory.length > 0 ? transactionHistory.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                            <div>
                                <p className="font-medium">{e.description}</p>
                                <p className="text-xs text-muted-foreground">
                                    Paid by {findUserById(e.paidById)?.name} on {format(new Date(e.date), "MMM d, yyyy")}
                                </p>
                            </div>
                            <div className="text-right">
                                  <p className="font-mono">{formatCurrency(e.amount)}</p>
                                  <Badge variant={e.status === 'settled' ? 'secondary' : 'default'}>{e.status}</Badge>
                            </div>
                        </div>
                    )) : <p className="text-center text-muted-foreground py-4">No 1-on-1 transactions yet. Go buy 'em a coffee!</p>}
                    </div>
                </ScrollArea>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSettled}>Settle Up</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Settle debts with {friend.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This marks all 1-on-1 expenses as paid. Make sure you've actually got the cash. This can't be undone.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Nvm, cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSettle}>Yeah, we're square</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </DialogContent>
        </Dialog>
    )
  }
  
  if (isAuthLoading || !currentUser) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const friendTrustScore = selectedFriendForScore ? calculateUserTrustScore(selectedFriendForScore.id) : 0;

  return (
    <>
      <div className="flex flex-col min-h-screen w-full pb-20">
        <Header pageTitle="Friends" />
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-8">
            <Tabs defaultValue="friends" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="requests">
                  Requests {friendRequests.length > 0 && <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 text-xs rounded-full flex items-center justify-center">{friendRequests.length > 9 ? '9+' : friendRequests.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="discover">Discover</TabsTrigger>
              </TabsList>
              
              <TabsContent value="friends">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Squad</CardTitle>
                        <CardDescription>Your connections on SettleSmart. Or as you call them, "the group chat".</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {friends.map(friend => {
                           const unreadCount = chats.find(c => c.id.includes(friend.id))?.unreadCount?.[currentUser.id] || 0;
                           const isAdhoc = friend.email.endsWith('@adhoc.settlesmart.app');
                          return (
                          <div key={friend.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                              <Avatar className="h-10 w-10">
                                  <AvatarImage src={friend.avatar} alt={friend.name} />
                                  <AvatarFallback>{friend.initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                  <div className="font-semibold">{friend.name} {isAdhoc && <Badge variant="outline">Contact</Badge>}</div>
                                  <p className="text-sm text-muted-foreground">{isAdhoc ? 'Not on SettleSmart yet' : friend.email}</p>
                              </div>
                               <Button variant="ghost" size="icon" onClick={() => router.push(`/chat/${friend.id}`)} disabled={isProcessing || isAdhoc} className="relative">
                                <MessageSquare className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isProcessing}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setSelectedFriendForHistory(friend)}>
                                        <History className="mr-2 h-4 w-4" />
                                        <span>Transaction History</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setSelectedFriendForScore(friend)}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>Vibe Check (Trust Score)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleRemoveFriend(friend.id)}>
                                        <UserMinus className="mr-2 h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Unfriend</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        )})}
                         {friends.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                <h3 className="text-xl font-bold mb-2">It's quiet in here...</h3>
                                <p className="mb-4">Add an expense with someone, or find them in "Discover" to get the party started.</p>
                            </div>
                        )}
                      </div>
                    </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="requests">
                 <Card>
                    <CardHeader>
                        <CardTitle>Friend Requests</CardTitle>
                        <CardDescription>People who want to be in your financial circle.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-4">
                          {friendRequests.map(({ friendship, user }) => (
                            <div key={friendship.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <Button variant="outline" size="icon" onClick={() => handleAcceptRequest(friendship.id)} disabled={isProcessing}>
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleDeclineRequest(friendship.id)} disabled={isProcessing}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                          ))}
                           {friendRequests.length === 0 && (
                              <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                  <h3 className="text-xl font-bold mb-2">No new requests</h3>
                                  <p className="mb-4">Your social circle is up to date. For now.</p>
                              </div>
                          )}
                       </div>
                    </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="discover">
                  <Card>
                    <CardHeader>
                        <CardTitle>Discover Users</CardTitle>
                        <CardDescription>Find other people on SettleSmart.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {otherUsers.map(user => {
                              const isRequestSent = sentRequests.has(user.id);
                              return (
                                <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleSendRequest(user.id)} disabled={isProcessing || isRequestSent}>
                                      {isRequestSent ? (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Sent
                                        </>
                                      ) : (
                                        <>
                                         <UserPlus className="h-4 w-4 mr-2" />
                                          Add Friend
                                        </>
                                      )}
                                    </Button>
                                </div>
                              )
                            })}
                            {otherUsers.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                    <h3 className="text-xl font-bold mb-2">Wow, you know everyone!</h3>
                                    <p className="mb-4">There are no other SettleSmart users to add right now.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </main>
      </div>

       <AlertDialog open={!!selectedFriendForScore} onOpenChange={(open) => !open && setSelectedFriendForScore(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{selectedFriendForScore?.name}'s Trust Score</AlertDialogTitle>
                    <AlertDialogDescription>
                        This score reflects their financial reliability based on their activity in the app. Higher is better!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <TrustScoreIndicator score={friendTrustScore} />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedFriendForScore(null)}>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <TransactionHistoryDialog />
    </>
  );
}
