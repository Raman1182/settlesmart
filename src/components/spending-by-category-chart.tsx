
"use client"

import * as React from "react"
import { Pie, PieChart, Sector } from "recharts"
import { useSettleSmart } from "@/context/settle-smart-context"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-semibold">
        {payload.category}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
       <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs font-bold">{`${formatCurrency(value)}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export function SpendingByCategoryChart() {
    const { expenses, currentUser } = useSettleSmart();
    const [activeIndex, setActiveIndex] = React.useState(0);

    const onPieEnter = React.useCallback(
        (_: any, index: number) => {
            setActiveIndex(index);
        },
        [setActiveIndex]
    );

    const spendingByCategory = React.useMemo(() => {
        if (!currentUser) return {};

        return expenses.reduce((acc, expense) => {
            const isParticipant = expense.splitWith.includes(currentUser.id);
            if (!isParticipant) return acc;

            const category = expense.category || 'Other';
            if (!acc[category]) {
                acc[category] = 0;
            }

            if (expense.splitType === 'equally') {
                acc[category] += expense.amount / expense.splitWith.length;
            } else {
                const userSplit = expense.unequalSplits?.find(s => s.participantId === currentUser.id);
                acc[category] += userSplit?.amount || 0;
            }
            
            return acc;
        }, {} as Record<string, number>);

    }, [expenses, currentUser]);


    const chartData = Object.entries(spendingByCategory).map(([category, amount], index) => ({
        category,
        amount,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    const chartConfig = chartData.reduce((acc, item, index) => {
        acc[item.category] = {
            label: item.category,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
        return acc;
    }, {} as any);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Your Spending by Category</CardTitle>
                <CardDescription>A breakdown of your personal share of expenses.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex items-center justify-center">
                {chartData.length > 0 ? (
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[350px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel hideIndicator />}
                            />
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                dataKey="amount"
                                onMouseEnter={onPieEnter}
                            />
                        </PieChart>
                    </ChartContainer>
                ) : (
                     <div className="flex h-full items-center justify-center text-center text-muted-foreground p-8">
                        <p>No spending data available. Add an expense to see your category breakdown.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
