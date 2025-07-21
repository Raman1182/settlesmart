"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { DashboardOverview } from "@/components/dashboard-overview";
import { RecentExpenses } from "@/components/recent-expenses";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export function Dashboard() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <AppSidebar />
        <SidebarInset>
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
              <DashboardOverview />
              <RecentExpenses />
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
