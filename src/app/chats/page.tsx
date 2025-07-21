"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ChatsPage() {
    const { currentUser, isAuthLoading, chats } = useSettleSmart();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthLoading && !currentUser) {
            router.replace("/login");
        }
    }, [isAuthLoading, currentUser, router]);

    const sortedChats = useMemo(() => {
        return chats.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        });
    }, [chats]);

    if (isAuthLoading || !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen w-full pb-20">
            <Header pageTitle="Chats" />
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>All Conversations</CardTitle>
                        <CardDescription>Your chats with friends on SettleSmart.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {sortedChats.map(chat => {
                                const friend = chat.participants.find(p => p.id !== currentUser.id);
                                if (!friend) return null;

                                return (
                                    <div 
                                        key={chat.id} 
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                                        onClick={() => router.push(`/chat/${friend.id}`)}
                                    >
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={friend.avatar} alt={friend.name} />
                                            <AvatarFallback>{friend.initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{friend.name}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                {chat.lastMessage?.text || "No messages yet."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                                             {chat.lastMessage && (
                                                <span>{formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })}</span>
                                             )}
                                             {chat.unreadCount > 0 && (
                                                <Badge variant="destructive">{chat.unreadCount}</Badge>
                                             )}
                                        </div>
                                    </div>
                                )
                            })}
                            {sortedChats.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-12">
                                    <MessageSquarePlus className="h-10 w-10 mb-4" />
                                    <h3 className="text-xl font-bold mb-2">No chats yet</h3>
                                    <p className="mb-4">Add some friends to start chatting and settling up!</p>
                                    <button onClick={() => router.push('/friends')} className="text-primary hover:underline">Go to Friends</button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
