
"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, Info, HandCoins } from "lucide-react";
import type { Expense, Message } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";


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
    expenses,
    confirmSettlement,
    declineSettlement
  } = useSettleSmart();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, startSendingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const friend = useMemo(() => findUserById(friendId), [findUserById, friendId]);

  const balanceWithFriend = useMemo(() => {
    if (!currentUser || !friend) return 0;
    
    let balance = 0;
    expenses.forEach(e => {
        const isUnsettled1on1 = e.groupId === null && 
                                e.status === 'unsettled' && 
                                e.splitWith.length === 2 && 
                                e.splitWith.includes(currentUser.id) && 
                                e.splitWith.includes(friend.id);

        if (isUnsettled1on1) {
            const amountPerPerson = e.amount / 2;
            if (e.paidById === currentUser.id) {
                balance -= amountPerPerson; // Friend owes me
            } else {
                balance += amountPerPerson; // I owe friend
            }
        }
    });
    // balance > 0 means I owe friend
    // balance < 0 means friend owes me
    return balance;

  }, [currentUser, friend, expenses]);

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
        await sendMessage(friendId, input);
        setInput("");
      } catch (error) {
        console.error("Failed to send message", error);
      }
    });
  };

  const handleRemind = async () => {
    if (!friend) return;
    const amountOwed = formatCurrency(Math.abs(balanceWithFriend));
    await sendMessage(friend.id, `Just a friendly nudge! Looks like you owe me ${amountOwed}. No rush, just a reminder!`, 'system');
    toast({ title: "Reminder Sent!", description: `A gentle nudge has been sent to ${friend.name}.` });
  };
  
  const handleConfirm = async (message: Message) => {
    if (!message.relatedExpenseIds) return;
    await confirmSettlement(message.relatedExpenseIds, message.id, message.chatId);
    toast({ title: "Settled!", description: "The transaction has been confirmed and marked as paid." });
  }

  const handleDecline = async (message: Message) => {
      if (!message.relatedExpenseIds) return;
      await declineSettlement(message.id, message.chatId);
      toast({ variant: "destructive", title: "Settlement Declined", description: "You've marked that the payment was not received." });
  }


  if (isAuthLoading || !currentUser || !friend) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const friendOwesMe = balanceWithFriend < -0.01;

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
            <div className="flex-1" />
            {friendOwesMe && (
                <Button variant="outline" size="sm" onClick={handleRemind}>
                    <HandCoins className="h-4 w-4 mr-2" />
                    Remind to Pay
                </Button>
            )}
        </div>
        <Card className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index-1].senderId !== message.senderId;
                const isCurrentUser = message.senderId === currentUser.id;
                const sender = isCurrentUser ? currentUser : friend;

                if (message.type?.startsWith('system')) {
                    const isConfirmation = message.type === 'system_confirmation';
                    const isAwaitingConfirmation = isConfirmation && message.status === 'pending';
                    const isConfirmationForCurrentUser = isConfirmation && message.recipientId === currentUser.id;
                    const isConfirmed = message.status === 'confirmed';
                    const isDeclined = message.status === 'declined';

                    return (
                        <div key={message.id} className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground my-2">
                           <div className="flex items-center gap-2 text-center p-2 bg-muted/50 rounded-md">
                             <Info className="h-4 w-4 shrink-0" /> <span>{message.text}</span>
                           </div>
                            {isAwaitingConfirmation && isConfirmationForCurrentUser && (
                                <div className="flex gap-2 mt-1">
                                    <Button size="sm" onClick={() => handleConfirm(message)}>Yes, I got it</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDecline(message)}>No, not yet</Button>
                                </div>
                            )}
                            {isConfirmed && <Badge variant="secondary">Payment Confirmed</Badge>}
                            {isDeclined && <Badge variant="destructive">Payment Declined</Badge>}
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
