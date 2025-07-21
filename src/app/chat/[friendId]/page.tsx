"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function ChatPage() {
  const { friendId } = useParams();
  const router = useRouter();
  const {
    currentUser,
    findUserById,
    getChatMessages,
    sendMessage,
    isAuthLoading,
  } = useSettleSmart();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, startSendingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const friend = findUserById(friendId as string);

  useEffect(() => {
    if (!isAuthLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isAuthLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser || !friendId) return;
    
    const unsubscribe = getChatMessages(friendId as string, (newMessages) => {
        setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentUser, friendId, getChatMessages]);

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
        await sendMessage(friendId as string, input);
        setInput("");
      } catch (error) {
        console.error("Failed to send message", error);
        // Optionally show a toast error
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
        <Card className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
              {messages.map((message, index) => {
                const showAvatar = index === 0 || messages[index-1].senderId !== message.senderId;
                const isCurrentUser = message.senderId === currentUser.id;
                const sender = isCurrentUser ? currentUser : friend;

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
                                <AvatarImage src={sender.avatar} alt={sender.name} />
                                <AvatarFallback>{sender.initials}</AvatarFallback>
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
                                {format(new Date(message.timestamp), "h:mm a")}
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
