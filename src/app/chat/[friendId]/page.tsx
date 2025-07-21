
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSettleSmart } from '@/context/settle-smart-context';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export default function ChatPage() {
  const { friendId } = useParams() as { friendId: string };
  const { currentUser, findUserById, getChatMessages, sendMessage, isLoading } = useSettleSmart();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const friend = findUserById(friendId);

  useEffect(() => {
    if (isLoading || !currentUser) return;
    if (!friend) {
      router.replace('/friends');
      return;
    }

    const unsubscribe = getChatMessages(friendId, (chatMessages) => {
      setMessages(chatMessages);
    });

    return () => unsubscribe();
  }, [friendId, currentUser, isLoading, friend, router, getChatMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(friendId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally show a toast notification for error
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !currentUser || !friend) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <Header pageTitle={`Chat with ${friend.name}`} />
      <div className="flex items-center gap-4 border-b p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar>
          <AvatarImage src={friend.avatar} alt={friend.name} />
          <AvatarFallback>{friend.initials}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold">{friend.name}</h2>
      </div>
      <main className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-end gap-2 max-w-xs',
                  message.senderId === currentUser.id ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <Avatar className="h-8 w-8">
                   <AvatarImage src={message.senderId === currentUser.id ? currentUser.avatar : friend.avatar} />
                   <AvatarFallback>{message.senderId === currentUser.id ? currentUser.initials : friend.initials}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    message.senderId === currentUser.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
