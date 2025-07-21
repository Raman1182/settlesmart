
"use client"

import { Button } from "@/components/ui/button"
import { Search, Bell, Command } from "lucide-react"
import { UserNav } from "./user-nav"
import { Input } from "./ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { useSettleSmart } from "@/context/settle-smart-context"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "./ui/badge"
import { useRouter } from "next/navigation"

interface HeaderProps {
  pageTitle?: string;
}

export function Header({ pageTitle = "Dashboard" }: HeaderProps) {
    const { findUserById, currentUser } = useSettleSmart();
    const router = useRouter();
    
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
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <UserNav />
          </div>
        </header>
    );
}
