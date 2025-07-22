
"use client";

import { Header } from "@/components/header";
import { SpendingBreakdown } from "@/components/insights/spending-breakdown";
import { BalanceTimelineChart } from "@/components/insights/balance-timeline-chart";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Loader2 } from "lucide-react";
import { FinancialStandings } from "@/components/insights/financial-standings";
import { GroupSpendingSummary } from "@/components/insights/group-spending-summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIDebrief } from "@/components/insights/ai-debrief";


export default function InsightsPage() {
    const { currentUser, isAuthLoading } = useSettleSmart();

    if (isAuthLoading || !currentUser) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen w-full">
            <Header pageTitle="Insights" />
            <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8 overflow-y-auto pb-24">
              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="ai-debrief">AI Debrief</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-4 md:space-y-8">
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                        <SpendingBreakdown />
                        <div className="lg:col-span-2 grid auto-rows-max gap-4 md:gap-8">
                          <FinancialStandings />
                          <GroupSpendingSummary />
                        </div>
                    </div>
                    <BalanceTimelineChart />
                  </div>
                </TabsContent>
                <TabsContent value="ai-debrief" className="mt-6">
                  <AIDebrief />
                </TabsContent>
              </Tabs>
            </main>
        </div>
    );
}
