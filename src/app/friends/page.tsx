
"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, UserPlus, Check, X, UserMinus, MessageSquare, MoreVertical, Shield } from "lucide-react";
import type { User, Friendship } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { TrustScoreIndicator } from "@/components/trust-score-indicator";


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
    chats,
    calculateUserTrustScore,
  } = useSettleSmart();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, startProcessingTransition] = useTransition();
  const [selectedFriendForScore, setSelectedFriendForScore] = useState<User | null>(null);
  
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
      const friendId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
      if (f.status === 'accepted') {
        const user = users.find(u => u.id === friendId);
        if (user) {
          currentFriends.push(user);
          myFriendshipIds.add(user.id);
        }
      } else if (f.status === 'pending') {
          if (f.receiverId === currentUser.id) {
            const user = users.find(u => u.id === f.requesterId);
            if (user) requests.push({ friendship: f, user });
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
        toast({ title: "Friend request sent!" });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
  };

  const handleAcceptRequest = (friendshipId: string) => {
    startProcessingTransition(async () => {
      try {
        await acceptFriendRequest(friendshipId);
        toast({ title: "Friend request accepted!" });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
  };

  const handleDeclineRequest = (friendshipId: string) => {
     startProcessingTransition(async () => {
      try {
        await declineFriendRequest(friendshipId);
        toast({ title: "Friend request declined." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
  };

  const handleRemoveFriend = (friendId: string) => {
     startProcessingTransition(async () => {
      try {
        await removeFriend(friendId);
        toast({ title: "Friend removed." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
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
                        <CardTitle>Your Friends</CardTitle>
                        <CardDescription>Your connections and contacts on SettleSmart.</CardDescription>
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
                                  <p className="font-semibold">{friend.name} {isAdhoc && <Badge variant="outline">Contact</Badge>}</p>
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
                                    <DropdownMenuItem onSelect={() => handleRemoveFriend(friend.id)}>
                                        <UserMinus className="mr-2 h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Unfriend</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setSelectedFriendForScore(friend)}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>Trust Score</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        )})}
                         {friends.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                                <p className="mb-4">Add an expense with someone, or find users in the "Discover" tab to add friends.</p>
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
                        <CardDescription>People who want to connect with you.</CardDescription>
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
                                  <h3 className="text-xl font-bold mb-2">No new friend requests</h3>
                                  <p className="mb-4">Check back later!</p>
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
                        <CardDescription>Find and add other users on SettleSmart.</CardDescription>
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
                                    <h3 className="text-xl font-bold mb-2">You know everyone!</h3>
                                    <p className="mb-4">There are no other users to add right now.</p>
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
                        This score reflects financial reliability based on their activity in the app. Higher is better!
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
    </>
  );
}
