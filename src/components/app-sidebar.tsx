"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    Users,
} from "lucide-react";
import {
    Sidebar,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
} from "@/components/ui/sidebar";
import { SettleSmartLogo } from "./icons";
import { usePathname } from "next/navigation";
import { UserNav } from "./user-nav";


export function AppSidebar() {
    const pathname = usePathname();
    return (
        <Sidebar>
            <SidebarHeader className="hidden md:flex">
                <div className="flex h-10 w-full items-center gap-2 rounded-md px-2 text-sm font-medium">
                  <SettleSmartLogo className="h-6 w-6" />
                  <span className="text-lg font-bold">SettleSmart</span>
                </div>
            </SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
                        <Link href="/">
                            <LayoutDashboard />
                            <span>Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/groups')} tooltip="Groups" disabled>
                        <Link href="#">
                            <Users />
                            <span>Groups</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <SidebarFooter className="hidden md:flex mt-auto">
                {/* UserNav could go here if design changes */}
            </SidebarFooter>
        </Sidebar>
    );
}
