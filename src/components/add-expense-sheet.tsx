
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSettleSmart } from "@/context/settle-smart-context";
import { parseExpense } from "@/ai/flows/parse-expense-from-natural-language";
import { categorizeExpense } from "@/ai/flows/categorize-expense";
import { DollarSign, Loader2, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import type { User } from "@/lib/types";
import { SheetTrigger } from "./ui/sheet";

const expenseFormSchema = z.object({
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  paidById: z.string().nonempty({ message: "Please select who paid." }),
  splitWith: z.array(z.string()).min(1, { message: "Select at least one person to split with." }),
  groupId: z.string().nonempty({ message: "Please select a group." }),
});

interface AddExpenseSheetProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseSheet({ children, open, onOpenChange }: AddExpenseSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [nlInput, setNlInput] = useState("");
  const [isParsing, startParsingTransition] = useTransition();
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const { addExpense, users, currentUser, groups, findUserById } = useSettleSmart();
  const { toast } = useToast();
  
  const controlledOpen = open !== undefined ? open : isSheetOpen;
  const setControlledOpen = onOpenChange !== undefined ? onOpenChange : setIsSheetOpen;

  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidById: "",
      splitWith: [],
      groupId: "",
    },
  });
  
  useEffect(() => {
    if (currentUser && controlledOpen) {
      form.setValue('paidById', currentUser.id);
    }
  }, [currentUser, controlledOpen, form]);

  const handleParse = () => {
    if (!nlInput) return;
    startParsingTransition(async () => {
      try {
        const result = await parseExpense({ naturalLanguageInput: nlInput });
        if (result) {
          form.setValue("description", result.description);
          form.setValue("amount", result.amount);
          
          const participantNames = result.participants.map(p => p.toLowerCase());
          const participantIds = users
            .filter(u => participantNames.includes(u.name.toLowerCase()) || (u.id === currentUser.id && participantNames.includes('you')))
            .map(u => u.id);
          
          if(currentUser && !participantIds.includes(currentUser.id)) {
            participantIds.push(currentUser.id);
          }

          form.setValue("splitWith", participantIds);

          toast({
            title: "Success: Expense Auto-filled",
            description: "We've parsed the details. Please review and select a group before submitting.",
          });
        }
      } catch (error) {
        console.error("AI parsing failed:", error);
        toast({
          variant: "destructive",
          title: "AI Parsing Failed",
          description: "We couldn't understand that. Please fill out the form manually.",
        });
      }
    });
  };

  const onSubmit = (values: z.infer<typeof expenseFormSchema>) => {
    startSubmittingTransition(async () => {
      try {
        const { category } = await categorizeExpense({ description: values.description });
        addExpense({ ...values, category: category || 'Other' });
        toast({
            title: "Expense Added",
            description: `The expense "${values.description}" has been successfully recorded.`,
        });
        resetForm();
        setControlledOpen(false);
      } catch (error) {
        console.error("Failed to add expense:", error);
        toast({
            variant: "destructive",
            title: "Error Adding Expense",
            description: "Something went wrong. Please try again.",
        });
      }
    });
  };
  
  const selectedGroupId = form.watch("groupId");
  const membersOfSelectedGroup = groups.find(g => g.id === selectedGroupId)?.members.map(id => findUserById(id)).filter(Boolean) as User[] || [];

  const resetForm = () => {
      form.reset({
        description: "",
        amount: 0,
        paidById: currentUser?.id || "",
        splitWith: [],
        groupId: "",
      });
      setNlInput("");
  }


  return (
    <Sheet open={controlledOpen} onOpenChange={(open) => {
        if(!open) resetForm();
        setControlledOpen(open);
    }}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg bg-background/90 backdrop-blur-sm">
        <SheetHeader className="p-6">
          <SheetTitle>Log a New Expense</SheetTitle>
          <SheetDescription>
            Describe your expense in plain English for our AI to parse, or fill out the form manually.
          </SheetDescription>
        </SheetHeader>
        <div className="p-6 border-y border-border/50 bg-card/50">
            <Textarea
                placeholder="e.g., $25 for pizza with Alice and Bob for the apartment"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                rows={3}
                className="bg-background text-base"
            />
            <Button onClick={handleParse} disabled={isParsing || !nlInput} className="w-full mt-4">
                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Parse with AI
            </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Coffee meeting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
                          const groupMembers = groups.find(g => g.id === value)?.members || [];
                          form.setValue("splitWith", groupMembers);
                          if(currentUser && !groupMembers.includes(currentUser.id)){
                             form.setValue("paidById", "");
                          } else if (currentUser) {
                             form.setValue("paidById", currentUser.id);
                          }
                      }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="paidById"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid by</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger disabled={!selectedGroupId}>
                            <SelectValue placeholder="Select who paid" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {membersOfSelectedGroup && membersOfSelectedGroup.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.initials}</AvatarFallback>
                                </Avatar>
                                <span>{user.name} {user.id === currentUser?.id ? "(You)" : ""}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

             {selectedGroupId && membersOfSelectedGroup?.length > 0 && (
                <FormField
                    control={form.control}
                    name="splitWith"
                    render={() => (
                    <FormItem>
                        <div>
                            <FormLabel className="text-base">Split between</FormLabel>
                            <FormDescription>Select who this expense should be split with.</FormDescription>
                        </div>
                        <div className="space-y-3 pt-2">
                        {membersOfSelectedGroup.map((item) => (
                            <FormField
                            key={item.id}
                            control={form.control}
                            name="splitWith"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md transition-colors hover:bg-muted/50"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <FormLabel className="font-normal flex items-center gap-2 cursor-pointer w-full">
                                         <Avatar className="h-8 w-8">
                                            <AvatarImage src={item.avatar} alt={item.name} />
                                            <AvatarFallback>{item.initials}</AvatarFallback>
                                        </Avatar>
                                        {item.name}
                                    </FormLabel>
                                </FormItem>
                                )
                            }}
                            />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             )}
            </div>

            <SheetFooter className="p-6 bg-card/80 border-t border-border/50 mt-auto">
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Expense
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
