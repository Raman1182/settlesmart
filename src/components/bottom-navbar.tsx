
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, MessageSquare, LineChart, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddExpenseSheet } from "./add-expense-sheet";
import { Button } from "./ui/button";
import { useSettleSmart } from "@/context/settle-smart-context";
import { useMemo } from "react";
import { Badge } from "./ui/badge";

export function BottomNavbar() {
  const pathname = usePathname();
  const { chats, friendships, currentUser } = useSettleSmart();

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((acc, chat) => acc + chat.unreadCount, 0);
  }, [chats]);
  
  const friendRequestCount = useMemo(() => {
    if(!currentUser) return 0;
    return friendships.filter(f => f.status === 'pending' && f.receiverId === currentUser.id).length;
  }, [friendships, currentUser]);


  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "#", label: "Add", icon: Plus, isAction: true },
    { href: "/chats", label: "Chats", icon: MessageSquare, notificationCount: totalUnreadCount },
    { href: "/friends", label: "Friends", icon: Bell, notificationCount: friendRequestCount },
  ];
  
    if (pathname.startsWith('/login')) {
      return null;
    }

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-20 bg-background/80 backdrop-blur-sm border-t border-border/50">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
            if (item.isAction) {
                return (
                    <div key={item.label} className="flex items-center justify-center">
                        <AddExpenseSheet>
                            <Button size="icon" className="w-16 h-16 rounded-full shadow-lg bg-primary/90 shadow-primary/30 -translate-y-6 border-4 border-background">
                                <Plus className="w-8 h-8" />
                            </Button>
                        </AddExpenseSheet>
                    </div>
                )
            }
          return (
             <Link
                key={item.label}
                href={item.href}
                className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group relative",
                 (pathname === item.href || (item.href === '/friends' && pathname.startsWith('/friends')))
                  ? "text-primary" 
                  : "text-muted-foreground"
                )}
            >
                <item.icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.label}</span>
                 {item.notificationCount && item.notificationCount > 0 && (
                    <Badge variant="destructive" className="absolute top-2 right-4 h-4 w-4 p-0 flex items-center justify-center text-xs">
                        {item.notificationCount}
                    </Badge>
                )}
            </Link>
          )
        })}
      </div>
    </div>
  );
}
