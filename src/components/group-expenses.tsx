
"use client";
import { useMemo } from 'react';
import { useSettleSmart } from "@/context/settle-smart-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Utensils, Plane, Film, Lightbulb, Home, ShoppingCart, Package } from 'lucide-react';

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Food & Drink': <Utensils className="h-5 w-5" />,
  'Travel': <Plane className="h-5 w-5" />,
  'Entertainment': <Film className="h-5 w-5" />,
  'Utilities': <Lightbulb className="h-5 w-5" />,
  'Rent': <Home className="h-5 w-5" />,
  'Groceries': <ShoppingCart className="h-5 w-5" />,
  'Other': <Package className="h-5 w-5" />,
};

export function GroupExpenses({ groupId }: { groupId: string }) {
    const { expenses, findUserById, currentUser } = useSettleSmart();

    const groupExpenses = useMemo(() => {
        return expenses.filter(e => e.groupId === groupId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, groupId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Expense History</CardTitle>
                <CardDescription>All expenses recorded for this group.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="hidden sm:table-cell">Paid by</TableHead>
                            <TableHead className="hidden lg:table-cell">Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No expenses recorded in this group yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {groupExpenses.map(expense => {
                            const paidByUser = findUserById(expense.paidById);
                            const categoryIcon = categoryIcons[expense.category] || categoryIcons['Other'];
                            return (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-md hidden sm:block">
                                                {categoryIcon}
                                            </div>
                                            <div className="grid gap-0.5">
                                                <div className="font-medium">{expense.description}</div>
                                                <div className="text-sm text-muted-foreground sm:hidden">
                                                    Paid by {paidByUser?.id === currentUser.id ? 'you' : paidByUser?.name}
                                                </div>
                                                <div className="sm:hidden text-xs text-muted-foreground">{format(new Date(expense.date), 'MMM d, yyyy')}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={paidByUser?.avatar} alt={paidByUser?.name} />
                                                <AvatarFallback>{paidByUser?.initials}</AvatarFallback>
                                            </Avatar>
                                            <span>{paidByUser?.id === currentUser.id ? 'You' : paidByUser?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {format(new Date(expense.date), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
