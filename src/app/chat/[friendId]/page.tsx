

"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, Info } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function ChatSettleUp({ friendId }: { friendId: string }) {
    const { currentUser, findUserById, settleFriendDebt, sendMessage, expenses } = useSettleSmart();
    const friend = findUserById(friendId);

    const netBalance = useMemo(() => {
        if (!currentUser || !friend) return 0;
        let balance = 0;
        const relatedExpenses = expenses.filter(e => {
            const participants = new Set(e.splitWith);
            return !e.groupId && participants.has(currentUser.id) && participants.has(friendId) && participants.size === 2;
        });

        relatedExpenses.forEach(e => {
            const amountPerPerson = e.amount / e.splitWith.length;
            if (e.paidById === currentUser.id) {
                balance += amountPerPerson * (e.splitWith.length - 1);
            } else {
                balance -= amountPerPerson;
            }
        });
        return balance;
    }, [currentUser, friend, expenses]);

    const handleSettle = async () => {
        await settleFriendDebt(friendId);
    }

    const handleRemind = async () => {
        if (!currentUser || !friend) return;
        const reminderText = `Just a friendly reminder to settle our balance of ${formatCurrency(Math.abs(netBalance))}. Thanks!`;
        await sendMessage(friendId, reminderText);
    }

    if (!friend) return null;
    const isSettled = Math.abs(netBalance) < 0.01;
    const friendOwes = netBalance > 0;
    const userOwes = netBalance < 0;

    return (
        <Card className="mb-4">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-bold">
                        {isSettled && "You are all settled up!"}
                        {friendOwes && `${friend.name} owes you ${formatCurrency(netBalance)}`}
                        {userOwes && `You owe ${friend.name} ${formatCurrency(Math.abs(netBalance))}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Across all your 1-on-1 expenses.</p>
                </div>
                <div className="flex gap-2">
                    {friendOwes && <Button size="sm" onClick={handleRemind}>Remind</Button>}
                    {!isSettled && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="secondary">Settle All</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Settle all debts with {friend.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will delete all 1-on-1 expenses between you and {friend.name}, marking everything as paid. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSettle}>Yes, Settle Up</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


export default function ChatPage() {
  const { friendId: friendIdParam } = useParams();
  const friendId = friendIdParam as string;
  const router = useRouter();
  const {
    currentUser,
    findUserById,
    getChatMessages,
    sendMessage,
    markMessagesAsRead,
    isAuthLoading,
  } = useSettleSmart();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, startSendingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const friend = useMemo(() => findUserById(friendId), [findUserById, friendId]);

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isAuthLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser || !friendId) return;
    const chatId = [currentUser.id, friendId].sort().join('_');
    markMessagesAsRead(chatId);
    
    const unsubscribe = getChatMessages(friendId, (newMessages) => {
        setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentUser, friendId, getChatMessages, markMessagesAsRead]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !friendId) return;

    startSendingTransition(async () => {
      try {
        await sendMessage(friendId, input, 'user');
        setInput("");
      } catch (error) {
        console.error("Failed to send message", error);
      }
    });
  };

  if (isAuthLoading || !currentUser || !friend) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header pageTitle={`Chat with ${friend.name}`} />
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
                <Avatar>
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>{friend.initials}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{friend.name}</h1>
            </div>
        </div>
        <ChatSettleUp friendId={friend.id} />
        <Card className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index-1].senderId !== message.senderId;
                const isCurrentUser = message.senderId === currentUser.id;
                const sender = isCurrentUser ? currentUser : friend;

                if (message.type === 'system') {
                    return (
                        <div key={message.id} className="flex items-center justify-center gap-2 text-xs text-muted-foreground my-2">
                           <Info className="h-3 w-3" /> <span>{message.text}</span>
                        </div>
                    )
                }

                return(
                    <div
                        key={message.id}
                        className={cn(
                        "flex items-end gap-3",
                        isCurrentUser ? "justify-end" : "justify-start"
                        )}
                    >
                        {!isCurrentUser && (
                             <Avatar className={cn("w-8 h-8", !showAvatar && 'invisible')}>
                                <AvatarImage src={sender?.avatar} alt={sender?.name} />
                                <AvatarFallback>{sender?.initials}</AvatarFallback>
                            </Avatar>
                        )}
                         <div className="flex flex-col gap-1 max-w-sm md:max-w-md">
                            <div
                                className={cn(
                                "rounded-xl px-4 py-3 text-sm",
                                isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                            >
                                <p className="whitespace-pre-wrap">{message.text}</p>
                            </div>
                            <span className={cn("text-xs text-muted-foreground", isCurrentUser ? 'text-right' : 'text-left')}>
                                {message.timestamp ? format(new Date(message.timestamp), "h:mm a") : "sending..."}
                            </span>
                        </div>
                        {isCurrentUser && (
                            <Avatar className={cn("w-8 h-8", !showAvatar && 'invisible')}>
                                <AvatarImage src={sender.avatar} alt={sender.name} />
                                <AvatarFallback>{sender.initials}</AvatarFallback>
                           </Avatar>
                        )}
                    </div>
              )})}
               {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                    <p className="max-w-md">No messages yet. Say hello!</p>
                </div>
                )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-base"
                disabled={isSending}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
