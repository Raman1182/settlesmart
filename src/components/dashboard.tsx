
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
  const { currentUser, isLoading, balances } = useSettleSmart();

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getMyTrustScore = () => {
    // 1. lending to someone inc score - good
    // 2. borrowing dec it - bad
    // 3. repaying inc it - not tracked yet, but lower debt is good
    // 4. more debt decit - bad
    const owedToMe = balances.totalOwedToUser;
    const iOwe = balances.totalOwedByUser;
    
    // Start with a base score of 70
    let score = 70;
    
    // For every $100 owed to me, increase score slightly
    score += Math.min(20, owedToMe / 50);

    // For every $100 I owe, decrease score more significantly
    score -= Math.min(40, iOwe / 25);
    
    return Math.max(0, Math.min(100, score));
  }
  
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
                  <TrustScoreIndicator score={getMyTrustScore()} />
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
