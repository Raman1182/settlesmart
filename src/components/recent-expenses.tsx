
"use client";
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

export function RecentExpenses() {
    const { expenses, findUserById, groups } = useSettleSmart();

    const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'N/A';

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A log of all recent expenses across your groups.</CardDescription>
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
                        {expenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                No expenses yet. Add one to get started!
                                </TableCell>
                            </TableRow>
                        )}
                        {expenses.slice(0, 15).map(expense => {
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
                                                    Paid by {paidByUser?.id === useSettleSmart().currentUser?.id ? 'you' : paidByUser?.name} in <span className="font-medium text-foreground">{getGroupName(expense.groupId)}</span>
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
