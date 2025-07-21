
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { generateShoppingList } from "@/ai/flows/shopping-list-flow";
import { useSettleSmart } from "@/context/settle-smart-context";
import { useToast } from "@/components/ui/use-toast";
import type { Group } from "@/lib/types";

interface ChecklistItem {
    id: string;
    name: string;
    completed: boolean;
}

interface GroupChecklistProps {
    group: Group;
}

export function GroupChecklist({ group }: GroupChecklistProps) {
    const { groupChecklists, updateGroupChecklist } = useSettleSmart();
    const { toast } = useToast();
    const [prompt, setPrompt] = useState("");
    const [isGenerating, startGeneratingTransition] = useTransition();

    const checklist = groupChecklists[group.id] || [];

    const handleGenerate = () => {
        if (!prompt) return;
        startGeneratingTransition(async () => {
            try {
                const result = await generateShoppingList({ prompt });
                updateGroupChecklist(group.id, result.items);
                toast({ title: "Checklist Generated!", description: "Your AI-powered checklist is ready." });
                setPrompt("");
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to generate checklist." });
            }
        });
    };

    const toggleItem = (itemId: string) => {
        const updatedList = checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        updateGroupChecklist(group.id, updatedList);
    };

     const deleteItem = (itemId: string) => {
        const updatedList = checklist.filter(item => item.id !== itemId);
        updateGroupChecklist(group.id, updatedList);
    };

    const completedCount = checklist.filter(item => item.completed).length;
    const totalCount = checklist.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Checklist</CardTitle>
                <CardDescription>
                    Plan and track items for your group. Use AI to generate a list!
                    {totalCount > 0 && ` (${completedCount}/${totalCount} completed)`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g., Items for a beach party"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                            disabled={isGenerating}
                        />
                        <Button onClick={handleGenerate} disabled={isGenerating || !prompt}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {checklist.length === 0 && (
                             <div className="text-center text-muted-foreground py-8">
                                <p>No items in your checklist yet.</p>
                                <p className="text-sm">Generate one with AI or add items manually (coming soon).</p>
                             </div>
                        )}
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                                <Checkbox
                                    id={`item-${item.id}`}
                                    checked={item.completed}
                                    onCheckedChange={() => toggleItem(item.id)}
                                />
                                <label
                                    htmlFor={`item-${item.id}`}
                                    className={`flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}
                                >
                                    {item.name}
                                </label>
                                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive/80" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
