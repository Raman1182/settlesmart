
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, User as UserIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddExpenseSheet } from "./add-expense-sheet";
import { Button } from "./ui/button";

export function BottomNavbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/groups", label: "Groups", icon: Users, disabled: true },
    { href: "/friends", label: "Friends", icon: UserIcon, disabled: true },
    { href: "/profile", label: "Profile", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 backdrop-blur-sm border-t border-white/10">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.slice(0, 2).map((item) => (
          <Link
            key={item.label}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
              pathname === item.href ? "text-primary" : "text-muted-foreground",
              item.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
        <div className="flex items-center justify-center">
            <AddExpenseSheet />
        </div>
        {navItems.slice(2).map((item) => (
           <Link
            key={item.label}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
              pathname === item.href ? "text-primary" : "text-muted-foreground",
              item.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Override AddExpenseSheet trigger for mobile FAB
function MobileAddExpenseSheet() {
    return (
        <SheetTrigger asChild>
            <Button size="icon" className="w-14 h-14 rounded-full shadow-lg shadow-primary/30 -translate-y-4">
                <Plus className="w-6 h-6" />
            </Button>
        </SheetTrigger>
    )
}
