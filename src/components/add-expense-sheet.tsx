"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
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
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

export function AddExpenseSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [nlInput, setNlInput] = useState("");
  const [isParsing, startParsingTransition] = useTransition();
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const { addExpense, users, currentUser, groups } = useSettleSmart();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidById: currentUser.id,
      splitWith: [],
      groupId: "",
    },
  });

  const handleParse = () => {
    if (!nlInput) return;
    startParsingTransition(async () => {
      try {
        const result = await parseExpense({ naturalLanguageInput: nlInput });
        if (result) {
          form.setValue("description", result.description);
          form.setValue("amount", result.amount);
          
          const participantIds = result.participants
            .map(name => users.find(u => u.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is string => !!id);
          
          if(!participantIds.includes(currentUser.id)) {
            participantIds.push(currentUser.id);
          }

          form.setValue("splitWith", participantIds);

          toast({
            title: "Expense Parsed!",
            description: "We've filled in the details for you. Please review and submit.",
          });
        }
      } catch (error) {
        console.error("AI parsing failed:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "We couldn't parse that. Please try again or fill out the form manually.",
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
            title: "Expense Added!",
            description: `"${values.description}" has been added.`,
        });
        form.reset();
        setNlInput("");
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to add expense:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "There was a problem adding your expense.",
        });
      }
    });
  };
  
  const selectedGroupId = form.watch("groupId");
  const membersOfSelectedGroup = groups.find(g => g.id === selectedGroupId)?.members.map(id => users.find(u => u.id === id)).filter(Boolean) as any[];


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Add a New Expense</SheetTitle>
          <SheetDescription>
            Describe your expense in plain English or fill out the form below.
          </SheetDescription>
        </SheetHeader>
        <div className="p-6 border-t space-y-4">
            <Textarea
                placeholder="e.g., '$25 for pizza with Alice and Bob'"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                rows={3}
            />
            <Button onClick={handleParse} disabled={isParsing || !nlInput} className="w-full">
                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Parse with AI
            </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6 border-t">
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
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paidById"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid by</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select who paid" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                           form.setValue("splitWith", []);
                       }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group" />
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
              </div>

             {selectedGroupId && <FormField
                control={form.control}
                name="splitWith"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Split with</FormLabel>
                    </div>
                    {membersOfSelectedGroup.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="splitWith"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />}
            </div>

            <SheetFooter className="p-6 bg-muted/40 border-t mt-auto">
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
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
