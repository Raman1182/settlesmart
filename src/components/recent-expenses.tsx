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

export function RecentExpenses() {
    const { expenses, findUserById } = useSettleSmart();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>An overview of your recent group transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="hidden md:table-cell">Paid by</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.slice(0, 5).map(expense => {
                            const paidByUser = findUserById(expense.paidById);
                            return (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="font-medium">{expense.description}</div>
                                        <div className="text-sm text-muted-foreground md:hidden">
                                            {paidByUser?.name}, {formatDistanceToNow(new Date(expense.date), { addSuffix: true })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={paidByUser?.avatar} alt={paidByUser?.name} />
                                                <AvatarFallback>{paidByUser?.initials}</AvatarFallback>
                                            </Avatar>
                                            <span>{paidByUser?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {format(new Date(expense.date), "PPP")}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
