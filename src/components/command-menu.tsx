
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CreditCard,
  Home,
  LineChart,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSettleSmart } from "@/context/settle-smart-context";
import { answerFinancialQuestion } from "@/ai/flows/financial-qna-flow";
import { DialogTitle } from "@radix-ui/react-dialog";
import { AddExpenseSheet } from "./add-expense-sheet";
import { CreateGroupDialog } from "./create-group-dialog";

export function CommandMenu() {
  const router = useRouter();
  const { isCommandMenuOpen, setCommandMenuOpen, expenses, groups, users, balances, currentUser } = useSettleSmart();
  
  const [addExpenseOpen, setAddExpenseOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [aiResponse, setAiResponse] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandMenuOpen(!isCommandMenuOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isCommandMenuOpen, setCommandMenuOpen]);

  React.useEffect(() => {
    // Reset AI state when query changes
    setAiResponse("");
    setIsThinking(false);
  }, [query]);
  
  const runCommand = (command: () => void) => {
    setCommandMenuOpen(false);
    command();
  };
  
  const handleAiQuery = async () => {
      if (!query || isThinking) return;

      setIsThinking(true);
      setAiResponse("");
      try {
          const context = { expenses, groups, users, balances, currentUser };
          const result = await answerFinancialQuestion({ question: query, context });
          setAiResponse(result.answer);
      } catch (error) {
          console.error("AI query failed:", error);
          setAiResponse("Sorry, I had trouble understanding that. Could you try rephrasing?");
      } finally {
          setIsThinking(false);
      }
  }

  const showAiResponse = isThinking || aiResponse;

  return (
    <>
      <CommandDialog open={isCommandMenuOpen} onOpenChange={setCommandMenuOpen}>
         <DialogTitle className="sr-only">Command Menu</DialogTitle>
            <CommandInput 
                placeholder="Ask AI or type a command..."
                value={query}
                onValueChange={setQuery}
            />
        <CommandList>
          <CommandEmpty>
             {showAiResponse ? (
                <div className="p-4 text-sm">
                    {isThinking ? (
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    ) : (
                        <div className="text-foreground whitespace-pre-wrap">{aiResponse}</div>
                    )}
                </div>
            ) : "No results found."}
          </CommandEmpty>

        {!showAiResponse && (
          <>
            <CommandGroup heading="AI Assistant">
                <CommandItem onSelect={handleAiQuery}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Ask AI: "{query}"</span>
                </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/groups'))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Groups</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/friends'))}>
                <User className="mr-2 h-4 w-4" />
                <span>Friends</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/insights'))}>
                <LineChart className="mr-2 h-4 w-4" />
                <span>Insights</span>
                </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
                <CommandItem onSelect={() => runCommand(() => setAddExpenseOpen(true))}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Add Expense</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setCreateGroupOpen(true))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Create Group</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push('/assistant'))}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>AI Assistant</span>
                </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Groups">
                {groups.map(group => (
                    <CommandItem key={group.id} onSelect={() => runCommand(() => router.push(`/group/${group.id}`))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>{group.name}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
           </>
        )}
        </CommandList>
      </CommandDialog>
      <AddExpenseSheet open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </>
  );
}
