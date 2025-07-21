
"use client"

import { Button } from "@/components/ui/button"
import { Search, Bell, Command } from "lucide-react"
import { UserNav } from "./user-nav"
import { Input } from "./ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { useSettleSmart } from "@/context/settle-smart-context"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "./ui/badge"

interface HeaderProps {
  pageTitle?: string;
}

export function Header({ pageTitle = "Dashboard" }: HeaderProps) {
    const { messages, findUserById, markMessageAsRead } = useSettleSmart();
    const unreadCount = messages.filter(m => !m.read).length;

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 sticky top-0 z-30">
          <div className="w-full flex-1">
             <h1 className="text-lg font-semibold md:text-xl">{pageTitle}</h1>
          </div>
          <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
              <Button variant="outline" className="gap-2 text-muted-foreground pr-2">
                <Command className="h-4 w-4" />
                <span className="hidden md:inline-block">Search...</span>
                <kbd className="hidden md:inline-block pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">/</span>
                </kbd>
              </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {messages.length === 0 && <DropdownMenuItem disabled>No new messages</DropdownMenuItem>}
                    {messages.map(message => {
                        const sender = findUserById(message.senderId);
                        return (
                            <DropdownMenuItem key={message.id} onSelect={() => markMessageAsRead(message.id)}>
                                <div className="flex flex-col gap-1">
                                    <p className="font-semibold">{sender?.name || 'Unknown'}</p>
                                    <p className="text-sm text-muted-foreground">{message.text}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</p>
                                </div>
                                {!message.read && <div className="ml-auto h-2 w-2 rounded-full bg-primary self-start mt-1"></div>}
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <UserNav />
          </div>
        </header>
    );
}
