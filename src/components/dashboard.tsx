
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { DashboardOverview } from "@/components/dashboard-overview";
import { RecentExpenses } from "@/components/recent-expenses";
import { SpendingByCategoryChart } from "./spending-by-category-chart";
import { BalanceDetails } from "./balance-details";
import { SpendingOverTimeChart } from "./spending-over-time-chart";
import { useSettleSmart } from "@/context/settle-smart-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNavbar } from "./bottom-navbar";

export function Dashboard() {
  const { currentUser, isLoading } = useSettleSmart();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
      <AppSidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8">
          <DashboardOverview />
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
             <div className="xl:col-span-2 grid auto-rows-max gap-4 md:gap-8">
                 <SpendingOverTimeChart />
                 <RecentExpenses />
            </div>
            <div className="grid auto-rows-max gap-4 md:gap-8">
                <BalanceDetails />
                <SpendingByCategoryChart />
            </div>
          </div>
        </main>
        <BottomNavbar />
      </div>
    </div>
  );
}
