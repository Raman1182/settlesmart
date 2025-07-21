
"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    Wallet,
    PlusCircle,
    User,
    Receipt,
    Bot,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { cn } from "@/lib/utils";
import { CreateGroupDialog } from "./create-group-dialog";
import { Button } from "./ui/button";
import { AddExpenseSheet } from "./add-expense-sheet";


export function AppSidebar() {
    const pathname = usePathname();
    const { groups } = useSettleSmart();

    const navItems = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/groups', label: 'Groups', icon: Users, disabled: true },
        { href: '/friends', label: 'Friends', icon: User, disabled: true },
        { href: '/assistant', label: 'Assistant', icon: Bot, disabled: true },
        { href: '/receipts', label: 'Receipts', icon: Receipt, disabled: true },
    ]

    return (
        <div className="hidden border-r bg-background md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-16 items-center border-b px-4 lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
                        <Wallet className="h-6 w-6" />
                        <span className="text-xl">SettleSmart</span>
                    </Link>
                </div>
                <div className="flex-1 py-4">
                    <nav className="grid items-start px-2 text-base font-medium lg:px-4 gap-2">
                        {navItems.map(item => (
                            <Link
                                key={item.label}
                                href={item.disabled ? '#' : item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                    pathname === item.href && "bg-muted text-primary",
                                    item.disabled && "cursor-not-allowed opacity-50"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                         <div className="px-3 py-2">
                            <AddExpenseSheet />
                        </div>
                    </nav>
                </div>
                 <div className="mt-auto p-4 space-y-2">
                    <div className="px-2 lg:px-4 mb-2">
                        <div className="flex justify-between items-center mb-1">
                             <h3 className="text-xs font-semibold uppercase text-muted-foreground">Groups</h3>
                             <CreateGroupDialog />
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                            {groups.map(group => (
                                <Link
                                    key={group.id}
                                    href={`/group/${group.id}`}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-sm font-medium",
                                        pathname === `/group/${group.id}` && "bg-muted text-primary"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    <span>{group.name}</span>
                                </Link>
                            ))}
                             {groups.length === 0 && (
                                <p className="text-xs text-muted-foreground px-3 py-2">No groups yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
