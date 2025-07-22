
"use client";
import { useMemo, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSettleSmart } from "@/context/settle-smart-context";
import { format, formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Input } from './ui/input';
import { Search } from 'lucide-react';

export function RecentExpenses() {
    const { expenses, findUserById, groups, currentUser } = useSettleSmart();
    const [searchTerm, setSearchTerm] = useState('');

    const getGroupName = (groupId: string | null) => {
        if (!groupId) return 'Personal Expense';
        return groups.find(g => g.id === groupId)?.name || 'N/A';
    }

    const filteredExpenses = useMemo(() => {
        const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (!searchTerm) {
            return sorted;
        }
        return sorted.filter(expense => {
            const paidByUser = findUserById(expense.paidById);
            const groupName = getGroupName(expense.groupId);
            const searchLower = searchTerm.toLowerCase();

            return (
                expense.description.toLowerCase().includes(searchLower) ||
                expense.category.toLowerCase().includes(searchLower) ||
                (paidByUser && paidByUser.name.toLowerCase().includes(searchLower)) ||
                groupName.toLowerCase().includes(searchLower)
            );
        });
    }, [expenses, searchTerm, findUserById, groups]);


    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>A log of all recent expenses across your groups.</CardDescription>
                    </div>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search expenses..."
                            className="pl-10 w-full sm:w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="hidden lg:table-cell">Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredExpenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                {searchTerm ? `No results for "${searchTerm}"` : "No expenses yet. Add one to get started!"}
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredExpenses.slice(0, 15).map(expense => {
                            const paidByUser = findUserById(expense.paidById);
                            return (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={paidByUser?.avatar} alt={paidByUser?.name} />
                                                <AvatarFallback>{paidByUser?.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5">
                                                    <div className="font-medium">{expense.description}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Paid by {paidByUser?.id === currentUser?.id ? 'you' : paidByUser?.name} in <span className="font-medium text-foreground">{getGroupName(expense.groupId)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge variant="secondary">{expense.category}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="flex flex-col">
                                            <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(expense.date), { addSuffix: true })}</span>
                                        </div>
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
