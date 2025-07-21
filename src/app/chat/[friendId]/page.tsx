
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
import type { Message, User } from '@/lib/types';
import { format } from 'date-fns';

export default function ChatPage() {
  const { friendId } = useParams() as { friendId: string };
  const { currentUser, findUserById, getChatMessages, sendMessage, isLoading, friendships } = useSettleSmart();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [friend, setFriend] = useState<User | undefined>();

  useEffect(() => {
    if (friendId) {
      setFriend(findUserById(friendId));
    }
  }, [friendId, findUserById]);
  
  const isFriend = friendships.some(f => f.status === 'accepted' && f.userIds.includes(friendId));

  useEffect(() => {
    if (isLoading || !currentUser) return;
    if (!friendId) {
        router.replace('/friends');
        return;
    }
    if(!friend && !isLoading) {
        // Friend not found after loading, maybe redirect
    }

    const unsubscribe = getChatMessages(friendId, setMessages);

    return () => {
        if(unsubscribe) unsubscribe();
    };
  }, [friendId, currentUser, isLoading, router, getChatMessages]);

  useEffect(() => {
    if (!isLoading && friendId && !isFriend) {
        router.replace('/friends');
    }
  }, [isLoading, friendId, isFriend, router]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
         setTimeout(() => {
            viewport.scrollTop = viewport.scrollHeight;
         }, 100)
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
       <Header pageTitle="" />
       <div className="flex items-center gap-4 border-b p-2 md:p-4 sticky top-16 bg-background z-10">
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
          <div className="space-y-6">
            {messages.map((message, index) => {
                 const showAvatar = index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId;
                 const sender = message.senderId === currentUser.id ? currentUser : friend;
                 
                 return (
                    <div
                        key={message.id}
                        className={cn(
                        'flex items-end gap-2',
                        message.senderId === currentUser.id ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        )}
                    >
                       <div className="w-8">
                         {showAvatar && (
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={sender.avatar} />
                                <AvatarFallback>{sender.initials}</AvatarFallback>
                             </Avatar>
                         )}
                       </div>
                        <div
                        className={cn(
                            'rounded-lg px-3 py-2 text-sm max-w-xs md:max-w-md whitespace-pre-wrap',
                            message.senderId === currentUser.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        >
                        <p>{message.text}</p>
                         <p className={cn("text-xs mt-1", message.senderId === currentUser.id ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
                           {format(new Date(message.createdAt), 'h:mm a')}
                         </p>
                        </div>
                    </div>
                )
            })}
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-background sticky bottom-0">
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

    