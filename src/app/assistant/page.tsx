
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { useSettleSmart } from "@/context/settle-smart-context";
import { answerFinancialQuestion } from "@/ai/flows/financial-qna-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Sparkles, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  isLoading?: boolean;
}

const HISTORY_LIMIT = 6; // Keep the last 6 messages (3 user, 3 AI)

export default function AssistantPage() {
  const { expenses, groups, users, balances, currentUser, isAuthLoading } = useSettleSmart();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, startThinkingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to scroll to bottom after render
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                 viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || !currentUser) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: input,
      sender: "user",
    };

    const thinkingMessage: Message = {
        id: `msg-${Date.now()}-thinking`,
        text: "...",
        sender: "ai",
        isLoading: true,
    }

    const currentMessages = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    const currentInput = input;
    setInput("");

    startThinkingTransition(async () => {
      try {
        // Only include valid messages with non-empty text
        const history = currentMessages
          .slice(-HISTORY_LIMIT)
          .filter((msg) => typeof msg.text === 'string' && msg.text.trim() !== '')
          .map(({ id, isLoading, ...rest }) => rest);
        const context = { expenses, groups, users, balances, currentUser };

        const payload = {
          question: currentInput,
          history,
          context,
        };

        console.log("SENDING PAYLOAD TO AI:", JSON.stringify(payload, null, 2));

        const result = await answerFinancialQuestion(payload);

        if (!result || !result.answer) {
             throw new Error("Empty response from AI");
        }

        const aiMessage: Message = {
            id: `msg-${Date.now()}`,
            text: result.answer,
            sender: 'ai'
        };

        setMessages((prev) => [...prev.slice(0, -1), aiMessage]);

      } catch (error) {
        console.error("AI query failed:", error);
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          text: "⚠️ Oops, my brain hit a bug. Try again in a bit.",
          sender: "ai",
        };
        setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
      }
    });
  };

  if (isAuthLoading || !currentUser) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header pageTitle="Smart Assistant" />
      <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8">
        <div className="flex-1 flex flex-col gap-4">
             <Card className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="p-4 space-y-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                                <Sparkles className="h-12 w-12 mb-4 text-primary/50" />
                                <h3 className="text-xl font-bold font-heading">Welcome to your Smart Assistant</h3>
                                <p className="max-w-md">Ask me anything about your expenses, groups, or balances. For example: "How much did I spend on food last month?"</p>
                            </div>
                        )}
                        {messages.map((message) => (
                            <div
                            key={message.id}
                            className={cn(
                                "flex items-start gap-3",
                                message.sender === "user" ? "justify-end" : "justify-start"
                            )}
                            >
                            {message.sender === "ai" && (
                                <Avatar className="w-8 h-8 bg-primary/20 text-primary">
                                    <AvatarFallback><Sparkles className="w-4 h-4" /></AvatarFallback>
                                </Avatar>
                            )}
                            {message.isLoading ? (
                                <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                    <span>Thinking...</span>
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                    "max-w-sm md:max-w-md rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}
                                >
                                    {message.text}
                                </div>
                            )}
                             {message.sender === "user" && currentUser && (
                                 <Avatar className="w-8 h-8">
                                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                                    <AvatarFallback>{currentUser.initials}</AvatarFallback>
                                </Avatar>
                            )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-border/50">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 text-base"
                            disabled={isThinking}
                        />
                        <Button type="submit" size="icon" disabled={!input.trim() || isThinking}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
      </main>
    </div>
  );
}
