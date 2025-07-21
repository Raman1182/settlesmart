
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Plus, Receipt, Settings, Users, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddExpenseSheet } from "./add-expense-sheet";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/groups", label: "Groups", icon: Users, disabled: true },
  { href: "/friends", label: "Friends", icon: Wallet, disabled: true },
  { href: "/receipts", label: "Receipts", icon: Receipt, disabled: true },
  { href: "/assistant", label: "Assistant", icon: Bot, disabled: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="">SettleSmart</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  pathname === item.href && "bg-muted text-primary",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 space-y-4">
          <AddExpenseSheet />
          <Link href="/settings" className={cn(
             "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              pathname === "/settings" && "bg-muted text-primary"
          )}>
            <Settings className="h-4 w-4" />
            Profile & Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
