
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CreditCard,
  Home,
  Loader2,
  Plus,
  Settings,
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

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [aiResponse, setAiResponse] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  
  const { expenses, groups, users, balances, currentUser } = useSettleSmart();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  
  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };
  
  const handleAiQuery = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!query) return;

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

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
         <DialogTitle className="sr-only">Command Menu</DialogTitle>
        <form onSubmit={handleAiQuery}>
            <CommandInput 
                placeholder="Ask AI or type a command..."
                value={query}
                onValueChange={setQuery}
            />
        </form>
        <CommandList>
          <CommandEmpty>
            {isThinking ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : aiResponse ? (
                <div className="p-4 text-sm text-foreground">{aiResponse}</div>
            ) : (
                "No results found."
            )}
          </CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
             <CommandItem onSelect={() => runCommand(() => router.push('/groups'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Groups</span>
            </CommandItem>
            <CommandItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </CommandItem>
          </CommandGroup>
           <CommandGroup heading="Actions">
             <CommandItem onSelect={() => runCommand(() => setAddExpenseOpen(true))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Add Expense</span>
            </CommandItem>
            <CommandItem disabled>
              <Users className="mr-2 h-4 w-4" />
              <span>Create Group</span>
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
        </CommandList>
      </CommandDialog>
      <AddExpenseSheet open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </>
  );
}
