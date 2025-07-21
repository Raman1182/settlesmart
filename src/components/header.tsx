
"use client"

import { useMemo } from "react";
import { Button } from "@/components/ui/button"
import { Search, Bell, Command, UserPlus, MessageSquare } from "lucide-react"
import { UserNav } from "./user-nav"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { useSettleSmart } from "@/context/settle-smart-context"
import { Badge } from "./ui/badge"
import { useRouter } from "next/navigation"

interface HeaderProps {
  pageTitle?: string;
}

export function Header({ pageTitle = "Dashboard" }: HeaderProps) {
    const { currentUser, friendships, chats, setCommandMenuOpen } = useSettleSmart();
    const router = useRouter();

    const friendRequestCount = useMemo(() => {
        if (!currentUser) return 0;
        return friendships.filter(f => f.status === 'pending' && f.receiverId === currentUser.id).length;
    }, [friendships, currentUser]);

    const totalUnreadCount = useMemo(() => {
        if (!currentUser) return 0;
        return chats.reduce((acc, chat) => acc + (chat.unreadCount?.[currentUser.id] || 0), 0);
    }, [chats, currentUser]);

    const totalNotifications = friendRequestCount + totalUnreadCount;
    
    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
             <h1 className="text-lg font-semibold md:text-xl">{pageTitle}</h1>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
              <Button variant="outline" className="gap-2 text-muted-foreground pr-2 hidden md:flex" onClick={() => setCommandMenuOpen(true)}>
                <Command className="h-4 w-4" />
                <span className="hidden md:inline-block">Search...</span>
                <kbd className="hidden md:inline-block pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">⌘/</span>
                </kbd>
              </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full relative">
                        <Bell className="h-5 w-5" />
                        {totalNotifications > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {totalNotifications > 9 ? '9+' : totalNotifications}
                            </Badge>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     {totalNotifications === 0 ? (
                        <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                     ) : (
                        <>
                         {friendRequestCount > 0 && (
                            <DropdownMenuItem onClick={() => router.push('/friends')}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                <span>{friendRequestCount} new friend request{friendRequestCount > 1 ? 's' : ''}</span>
                            </DropdownMenuItem>
                         )}
                         {totalUnreadCount > 0 && (
                             <DropdownMenuItem onClick={() => router.push('/chats')}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>{totalUnreadCount} unread message{totalUnreadCount > 1 ? 's' : ''}</span>
                            </DropdownMenuItem>
                         )}
                        </>
                     )}
                </DropdownMenuContent>
            </DropdownMenu>
            <UserNav />
          </div>
        </header>
    );
}

    