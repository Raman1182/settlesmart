
"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
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
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useSettleSmart } from "@/context/settle-smart-context";
import { parseExpense } from "@/ai/flows/parse-expense-from-natural-language";
import { categorizeExpense } from "@/ai/flows/categorize-expense";
import { DollarSign, Loader2, Plus, Sparkles, Camera, Equal, Repeat } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import type { User, Participant } from "@/lib/types";
import { SheetTrigger } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Switch } from "./ui/switch";
import { Label } from "@/components/ui/label";

const splitSchema = z.object({
  participantId: z.string(),
  amount: z.coerce.number().optional(),
});

const expenseFormSchema = z.object({
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number.",
  }),
  paidById: z.string().nonempty({ message: "Please select who paid." }),
  splitWith: z.array(z.string()).min(1, { message: "Select at least one person to split with." }),
  splitType: z.enum(['equally', 'unequally']).default('equally'),
  unequalSplits: z.array(splitSchema).optional(),
  groupId: z.string().optional(),
  isRecurring: z.boolean().default(false),
}).refine(data => {
    if (data.splitType === 'unequally') {
        const totalSplit = data.unequalSplits?.reduce((sum, s) => sum + (s.amount || 0), 0) ?? 0;
        // Allow for small floating point inaccuracies
        return Math.abs(totalSplit - data.amount) < 0.01;
    }
    return true;
}, {
    message: "Whoops! The split amounts don't add up to the total expense.",
    path: ["unequalSplits"],
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
  
  const [adHocParticipants, setAdHocParticipants] = useState<string[]>([]);
  
  const controlledOpen = open !== undefined ? open : isSheetOpen;
  const setControlledOpen = onOpenChange !== undefined ? onOpenChange : setIsSheetOpen;

  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidById: "",
      splitWith: [],
      splitType: 'equally',
      unequalSplits: [],
      groupId: "",
      isRecurring: false,
    },
  });
  
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "unequalSplits",
  });
  
  const splitWith = form.watch("splitWith");
  const splitType = form.watch("splitType");
  const totalAmount = form.watch("amount");
  const unequalSplits = form.watch("unequalSplits");

  useEffect(() => {
    if (currentUser && controlledOpen) {
      form.reset({
        description: "",
        amount: 0,
        paidById: currentUser.id,
        splitWith: [currentUser.id],
        groupId: "",
        splitType: 'equally',
        unequalSplits: [],
        isRecurring: false,
      });
    }
  }, [currentUser, controlledOpen, form]);

  useEffect(() => {
    const newSplits = splitWith.map(pId => {
        const existing = unequalSplits?.find(s => s.participantId === pId);
        return { participantId: pId, amount: existing?.amount || 0};
    });
    replace(newSplits);
  }, [splitWith, replace]);

  const handleParse = () => {
    if (!nlInput) return;
    startParsingTransition(async () => {
      try {
        const result = await parseExpense({ naturalLanguageInput: nlInput });
        if (result && currentUser) {
          form.setValue("description", result.description);
          form.setValue("amount", result.amount);
          
          const participantNames = result.participants.map(p => p.toLowerCase());
          const finalParticipants: Participant[] = [];
          const newAdHoc: string[] = [];
          
          participantNames.forEach(name => {
             const isCurrentUser = ['you', 'me', 'i'].includes(name);
             const user = isCurrentUser 
                ? currentUser 
                : users.find(u => u.name.toLowerCase() === name);

            if (user) {
              if(!finalParticipants.includes(user.id)) finalParticipants.push(user.id);
            } else if (!isCurrentUser) {
               if(!finalParticipants.includes(name)) finalParticipants.push(name);
               if(!newAdHoc.includes(name)) newAdHoc.push(name);
            }
          });
          
          if (participantNames.some(p => ['you', 'me', 'i'].includes(p))) {
            if(!finalParticipants.includes(currentUser.id)) finalParticipants.push(currentUser.id);
          }
          
          setAdHocParticipants(prev => [...new Set([...prev, ...newAdHoc])]);
          form.setValue("splitWith", finalParticipants);

          toast({
            title: "Sweet! Expense auto-filled.",
            description: "We've parsed the details. Please review and submit.",
          });
        }
      } catch (error) {
        console.error("AI parsing failed:", error);
        toast({
          variant: "destructive",
          title: "Oops! My AI brain hiccuped.",
          description: "We couldn't understand that. Please fill out the form manually.",
        });
      }
    });
  };

  const onSubmit = (values: z.infer<typeof expenseFormSchema>) => {
    startSubmittingTransition(async () => {
      try {
        const { category } = await categorizeExpense({ description: values.description });
        addExpense({ ...values, groupId: values.groupId || null, category: category || 'Other' });
        toast({
            title: "Expense Added!",
            description: `Got it. "${values.description}" is on the books.`,
        });
        resetForm();
        setControlledOpen(false);
      } catch (error) {
        console.error("Failed to add expense:", error);
        toast({
            variant: "destructive",
            title: "Uh oh, something went wrong.",
            description: "Couldn't save the expense. Please try again.",
        });
      }
    });
  };
  
  const selectedGroupId = form.watch("groupId");

  const participantsToDisplay = useMemo(() => {
    const participantList: (User | { id: string; name: string; isAdHoc: true; initials: string })[] = [];
    const addedIds = new Set<string>();

    const addParticipant = (p: User | { id: string; name: string; isAdHoc: true; initials: string }) => {
        if (!addedIds.has(p.id)) {
            participantList.push(p);
            addedIds.add(p.id);
        }
    };
    
    // First add participants from group if selected
    if (selectedGroupId) {
        const group = groups.find(g => g.id === selectedGroupId);
        group?.members.map(id => findUserById(id)).filter(Boolean).forEach(u => addParticipant(u as User));
    }
    
    // Then add any other participants (from NL input or manual)
    splitWith.forEach(pId => {
        const user = findUserById(pId);
        if (user) {
            addParticipant(user);
        } else if (adHocParticipants.includes(pId)) {
             addParticipant({ id: pId, name: pId, isAdHoc: true, initials: pId.charAt(0).toUpperCase() });
        }
    });
    
    // Always ensure current user is an option if not in the group
    if (currentUser && !addedIds.has(currentUser.id)) {
        addParticipant(currentUser);
    }
    
    return participantList;
  }, [selectedGroupId, groups, findUserById, splitWith, adHocParticipants, currentUser]);

  const payerOptions = useMemo(() => {
    return participantsToDisplay.filter(p => !('isAdHoc' in p)) as User[];
  }, [participantsToDisplay]);

  const remainingToSplit = useMemo(() => {
    if (splitType === 'equally') return 0;
    const currentSplitTotal = unequalSplits?.reduce((sum, s) => sum + (s.amount || 0), 0) ?? 0;
    return totalAmount - currentSplitTotal;
  }, [splitType, totalAmount, unequalSplits]);


  const resetForm = () => {
      form.reset({
        description: "",
        amount: 0,
        paidById: currentUser?.id || "",
        splitWith: currentUser ? [currentUser.id] : [],
        groupId: "",
        splitType: 'equally',
        unequalSplits: [],
        isRecurring: false,
      });
      setNlInput("");
      setAdHocParticipants([]);
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
            Describe your expense in plain English, scan a receipt, or fill out the form manually.
          </SheetDescription>
        </SheetHeader>
        <div className="p-6 border-y border-border/50 bg-card/50">
            <Textarea
                placeholder="e.g., $25 for pizza with Alice and Bob"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                rows={3}
                className="bg-background text-base"
            />
            <div className="flex gap-2 mt-4">
                 <Button onClick={handleParse} disabled={isParsing || !nlInput} className="w-full">
                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Parse with AI
                </Button>
                <Button variant="outline" className="w-full" disabled>
                    <Camera className="mr-2 h-4 w-4" />
                    Scan Receipt
                </Button>
            </div>
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
                    <FormLabel>Group (Optional)</FormLabel>
                      <Select onValueChange={(value) => {
                          field.onChange(value);
                          const groupMembers = groups.find(g => g.id === value)?.members || [];
                          form.setValue("splitWith", groupMembers);
                          if(currentUser && !groupMembers.includes(currentUser.id)){
                             form.setValue("paidById", "");
                          } else if (currentUser) {
                             form.setValue("paidById", currentUser.id);
                          }
                          setAdHocParticipants([]); // Clear ad-hoc when group is selected
                      }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormDescription>Selecting a group pre-fills participants.</FormDescription>
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
                          <SelectTrigger disabled={payerOptions.length === 0}>
                            <SelectValue placeholder="Select who paid" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {payerOptions.map(user => (
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

             {participantsToDisplay.length > 0 && (
                <FormField
                    control={form.control}
                    name="splitWith"
                    render={() => (
                    <FormItem>
                        <div>
                            <FormLabel className="text-base">Split between</FormLabel>
                            <FormDescription>Select participants for this expense.</FormDescription>
                        </div>
                        <div className="space-y-3 pt-2">
                        {participantsToDisplay.map((item) => (
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
                                         {'isAdHoc' in item ? (
                                             <Badge variant="outline">{item.name}</Badge>
                                         ) : (
                                            <>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={item.avatar} alt={item.name} />
                                                <AvatarFallback>{item.initials}</AvatarFallback>
                                            </Avatar>
                                            {item.name}
                                            </>
                                         )}
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
            
            {splitWith.length > 1 && (
                <FormField
                    control={form.control}
                    name="splitType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Split Method</FormLabel>
                             <FormControl>
                                <ToggleGroup 
                                    type="single" 
                                    className="w-full grid grid-cols-2"
                                    value={field.value}
                                    onValueChange={(value) => {
                                        if (value) field.onChange(value as 'equally' | 'unequally');
                                    }}
                                >
                                    <ToggleGroupItem value="equally" aria-label="Split equally">
                                        <Equal className="h-4 w-4 mr-2" />
                                        Equally
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="unequally" aria-label="Split unequally">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Unequally
                                    </ToggleGroupItem>
                                </ToggleGroup>
                             </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {splitType === 'unequally' && (
                <div>
                     <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">Split by exact amounts</h4>
                            <Badge variant={remainingToSplit.toFixed(2) === '0.00' ? "default" : "destructive"}>
                                {remainingToSplit.toFixed(2)} left
                            </Badge>
                        </div>
                        {fields.map((field, index) => {
                            const participant = participantsToDisplay.find(p => p.id === field.participantId);
                            if (!participant) return null;
                            return (
                                <FormField
                                    key={field.id}
                                    control={form.control}
                                    name={`unequalSplits.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-4 space-y-0">
                                            <FormLabel className="w-2/5 flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={participant.avatar} alt={participant.name} />
                                                    <AvatarFallback>{participant.initials}</AvatarFallback>
                                                </Avatar>
                                                <span>{participant.name}</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" className="text-right" placeholder="0.00" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            );
                        })}
                     </div>
                      {form.formState.errors.unequalSplits && (
                          <p className="text-sm font-medium text-destructive pt-2">
                             {form.formState.errors.unequalSplits.message}
                          </p>
                      )}
                </div>
            )}
            
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Recurring Expense
                    </FormLabel>
                    <FormDescription>
                      Is this a recurring expense, like rent or a subscription?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
