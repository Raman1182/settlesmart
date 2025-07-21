
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
    { href: "/groups", label: "Groups", icon: Users },
    { href: "#", label: "Add", icon: Plus, isAction: true },
    { href: "/friends", label: "Friends", icon: UserIcon, disabled: true },
    { href: "/profile", label: "Profile", icon: Settings, disabled: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-20 bg-background/80 backdrop-blur-sm border-t border-white/10">
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
                href={item.disabled ? "#" : item.href}
                className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
                pathname === item.href ? "text-primary" : "text-muted-foreground",
                item.disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <item.icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  );
}
