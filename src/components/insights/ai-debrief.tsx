"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import { generateFinancialDebrief, type FinancialDebriefOutput } from "@/ai/flows/financial-debrief-flow";
import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "../ui/button";

export function AIDebrief() {
    const { expenses, groups, users, balances, currentUser } = useSettleSmart();
    const [isGenerating, startGeneratingTransition] = useTransition();
    const [debrief, setDebrief] = useState<FinancialDebriefOutput | null>(null);

    const handleGenerateDebrief = () => {
        startGeneratingTransition(async () => {
            const context = { expenses, groups, users, balances, currentUser };
            const result = await generateFinancialDebrief({ context });
            setDebrief(result);
        });
    }
    
    // Auto-generate on first load
    useEffect(() => {
        handleGenerateDebrief();
    }, []);

    if (isGenerating && !debrief) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-24">
                <Loader2 className="h-10 w-10 mb-4 animate-spin" />
                <h3 className="text-xl font-bold mb-2">Brewing Your AI Debrief...</h3>
                <p className="mb-4 max-w-sm">The AI is crunching the numbers and analyzing your financial vibes. Hold tight, this is gonna be good.</p>
            </div>
        )
    }
    
    if (!debrief) {
        return (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full rounded-lg border-2 border-dashed border-muted/50 py-24">
                <Wand2 className="h-10 w-10 mb-4" />
                <h3 className="text-xl font-bold mb-2">Get Your Personalized AI Debrief</h3>
                <p className="mb-4 max-w-sm">Want to know your spending personality? Get smart, actionable insights on your finances, powered by AI.</p>
                <Button onClick={handleGenerateDebrief} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Generate My Debrief
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle>Your Financial Debrief</CardTitle>
                    <CardDescription>{debrief.overallSummary}</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
                 {debrief.insights.map((insight, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <span>{insight.emoji}</span>
                                <span>{insight.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-muted-foreground">{insight.analysis}</p>
                        </CardContent>
                    </Card>
                 ))}
            </div>
             <div className="text-center">
                <Button onClick={handleGenerateDebrief} variant="outline" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Regenerate Debrief
                </Button>
             </div>
        </div>
    )

}
