
"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    Wallet,
} from "lucide-react";
import { SettleSmartLogo } from "./icons";
import { usePathname } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { cn } from "@/lib/utils";
import { CreateGroupDialog } from "./create-group-dialog";


export function AppSidebar() {
    const pathname = usePathname();
    const { groups, currentUser } = useSettleSmart();

    return (
        <div className="hidden border-r bg-background md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
                        <Wallet className="h-6 w-6" />
                        <span className="text-lg">SettleSmart</span>
                    </Link>
                </div>
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                        <Link
                            href="/"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                pathname === '/' && "bg-muted text-primary"
                            )}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Link>
                        
                    </nav>
                </div>
                 <div className="mt-auto p-4 space-y-4">
                    <div>
                        <div className="px-2 text-xs font-semibold uppercase text-muted-foreground lg:px-4 mb-2 flex justify-between items-center">
                            <span>Groups</span>
                            <CreateGroupDialog />
                        </div>
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                            {groups.map(group => (
                                <Link
                                    key={group.id}
                                    href="#"
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                                        "opacity-50 cursor-not-allowed" // Make it disabled for now
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    {group.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}
