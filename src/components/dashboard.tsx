
"use client";

import { Header } from "@/components/header";
import { DashboardOverview } from "@/components/dashboard-overview";
import { RecentExpenses } from "@/components/recent-expenses";
import { BalanceDetails } from "./balance-details";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Loader2 } from "lucide-react";
import { GroupsOverview } from "./groups-overview";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrustScoreIndicator } from "./trust-score-indicator";

export function Dashboard() {
  const { currentUser, isAuthLoading, calculateUserTrustScore } = useSettleSmart();

  if (isAuthLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const myTrustScore = calculateUserTrustScore(currentUser.id);
  
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <DashboardOverview />
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
           <div className="lg:col-span-2 grid auto-rows-max gap-4 md:gap-8">
               <RecentExpenses />
          </div>
          <div className="grid auto-rows-max gap-4 md:gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Your Trust Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrustScoreIndicator score={myTrustScore} />
                </CardContent>
              </Card>
              <BalanceDetails />
              <GroupsOverview />
          </div>
        </div>
      </main>
    </div>
  );
}

    