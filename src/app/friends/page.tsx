"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Plus, UserPlus, Check, X, UserMinus, MessageSquare } from "lucide-react";
import type { User, Friendship } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function FriendsPage() {
  const { 
    users, 
    currentUser, 
    isAuthLoading, 
    friendships, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest,
    removeFriend
  } = useSettleSmart();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, startProcessingTransition] = useTransition();
  
  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isAuthLoading, currentUser, router]);

  const { friends, friendRequests, otherUsers } = useMemo(() => {
    if (!currentUser) return { friends: [], friendRequests: [], otherUsers: [] };

    const currentFriends: User[] = [];
    const requests: { friendship: Friendship, user: User }[] = [];
    const myFriendshipIds = new Set<string>();

    friendships.forEach(f => {
      if (f.status === 'accepted') {
        const friendId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
        const user = users.find(u => u.id === friendId);
        if (user) {
          currentFriends.push(user);
          myFriendshipIds.add(user.id);
        }
      } else if (f.status === 'pending' && f.receiverId === currentUser.id) {
         const user = users.find(u => u.id === f.requesterId);
         if (user) requests.push({ friendship: f, user });
      }
    });

    const nonFriendUsers = users.filter(u => u.id !== currentUser.id && !myFriendshipIds.has(u.id));

    return { friends: currentFriends, friendRequests: requests, otherUsers: nonFriendUsers };
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

  return (
    <>
      <div className="flex flex-col min-h-screen w-full">
        <Header pageTitle="Friends" />
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-8">
            <Tabs defaultValue="friends" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="requests">
                  Requests {friendRequests.length > 0 && <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 text-xs rounded-full flex items-center justify-center">{friendRequests.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="discover">Discover</TabsTrigger>
              </TabsList>
              
              <TabsContent value="friends">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Friends</CardTitle>
                        <CardDescription>Your connections on SettleSmart.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {friends.map(friend => (
                          <div key={friend.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                              <Avatar className="h-10 w-10">
                                  <AvatarImage src={friend.avatar} alt={friend.name} />
                                  <AvatarFallback>{friend.initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                  <p className="font-semibold">{friend.name}</p>
                                  <p className="text-sm text-muted-foreground">{friend.email}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => router.push(`/chat/${friend.id}`)} disabled={isProcessing}>
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveFriend(friend.id)} disabled={isProcessing}>
                                <UserMinus className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                        ))}
                         {friends.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                <h3 className="text-xl font-bold mb-2">No friends yet</h3>
                                <p className="mb-4">Find users in the "Discover" tab to add friends.</p>
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
                            {otherUsers.map(user => (
                            <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{user.name}</p>
                                     <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <Button size="icon" onClick={() => handleSendRequest(user.id)} disabled={isProcessing}>
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                            ))}
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
    </>
  );
}
