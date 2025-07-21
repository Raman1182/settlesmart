
"use client";

import { Header } from "@/components/header";
import { SpendingByCategoryChart } from "@/components/spending-by-category-chart";
import { SpendingOverTimeChart } from "@/components/spending-over-time-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useSettleSmart } from "@/context/settle-smart-context";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Users, ShoppingCart, Target } from "lucide-react";


export default function InsightsPage() {
    const { currentUser, isLoading } = useSettleSmart();

    if (isLoading || !currentUser) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen w-full">
            <Header pageTitle="Insights" />
            <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8 overflow-y-auto">
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
                    <SpendingByCategoryChart />
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequent Contacts</CardTitle>
                            <CardDescription>The people you transact with most often.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex h-full min-h-[250px] items-center justify-center text-center text-muted-foreground">
                                <p>Coming soon!</p>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
                 <SpendingOverTimeChart />
            </main>
        </div>
    );
}
