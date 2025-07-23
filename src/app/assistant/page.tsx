
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

const AIMessage = ({ text }: { text: string }) => {
    const [isComplete, setIsComplete] = useState(false);
    const [displayText, setDisplayText] = useState("");

    useEffect(() => {
        setDisplayText(text);
        // A simple way to check if streaming is "done" for the blinking cursor
        const timer = setTimeout(() => setIsComplete(true), 200);
        return () => clearTimeout(timer);
    }, [text]);

    return (
        <div
            className={cn(
            "max-w-sm md:max-w-md rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
            "bg-muted"
            )}
        >
            {displayText}
            {!isComplete && <span className="animate-pulse">▍</span>}
        </div>
    )
}


export default function AssistantPage() {
  const { expenses, groups, users, balances, currentUser } = useSettleSmart();
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
    if (!input.trim() || isThinking) return;

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
        const history = currentMessages.slice(-HISTORY_LIMIT).map(({ id, isLoading, ...rest}) => rest);
        const context = { expenses, groups, users, balances, currentUser };
        const stream = await answerFinancialQuestion({
          question: currentInput,
          history,
          context,
        });

        let fullText = "";
        let firstChunk = true;

        for await (const chunk of stream) {
            fullText += chunk;
             setMessages((prev) => {
                let lastMessage = prev[prev.length - 1];
                if (firstChunk) {
                    // Replace the "Thinking..." message on the first chunk
                    lastMessage = { ...lastMessage, text: '', isLoading: false };
                    firstChunk = false;
                }
                const updatedLastMessage = { ...lastMessage, text: fullText };
                return [...prev.slice(0, -1), updatedLastMessage];
            });
        }

      } catch (error) {
        console.error("AI query failed:", error);
        const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            text: "Sorry, I had trouble connecting to my brain. Please try again.",
            sender: "ai"
        }
        setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
      }
    });
  };

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
                            {message.sender === 'user' ? (
                                <div
                                    className={cn(
                                    "max-w-sm md:max-w-md rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                                    "bg-primary text-primary-foreground"
                                    )}
                                >
                                    {message.text}
                                </div>
                            ) : (
                                message.isLoading ? (
                                    <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        <span>Thinking...</span>
                                    </div>
                                ) : (
                                    <AIMessage text={message.text} />
                                )
                            )}
                             {message.sender === "user" && (
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
