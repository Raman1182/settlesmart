
"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Loader2, Users, ArrowLeft, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupMembers } from "@/components/group-members";
import { GroupExpenses } from "@/components/group-expenses";
import { GroupStats } from "@/components/group-stats";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function GroupDetailsPage() {
  const { id: groupId } = useParams();
  const router = useRouter();
  const { groups, findUserById, currentUser, isLoading: isAuthLoading, getGroupBalances } = useSettleSmart();

  const group = useMemo(() => groups.find(g => g.id === groupId), [groups, groupId]);

  const groupBalances = useMemo(() => {
    if (!group) return { total: 0, settled: 0, progress: 0, remaining: 0 };
    return getGroupBalances(group.id);
  }, [group, getGroupBalances]);
  
  if (isAuthLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <Header pageTitle="Group Not Found" />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:p-6">
          <p>The group you're looking for doesn't exist or you're not a member.</p>
          <Button onClick={() => router.push('/groups')}>Go to Groups</Button>
        </main>
      </div>
    );
  }
  
  const isOwner = group.createdBy === currentUser.id;

  return (
    <AlertDialog>
      <div className="flex flex-col min-h-screen w-full">
          <Header pageTitle={group.name} />
          <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8">
              <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => router.push('/groups')}>
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="p-3 bg-muted rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold flex-1">{group.name}</h1>
                  <Button variant="ghost" size="icon" disabled>
                      <Settings className="h-5 w-5" />
                  </Button>
              </div>

              <Card className="border-primary/20 shadow-primary/10">
                  <CardContent className="pt-6">
                      <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>Settlement Progress</span>
                              <span className="font-semibold text-foreground">{groupBalances.progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={groupBalances.progress} className="h-2" />
                          <div className="flex justify-between items-center text-xs pt-1">
                              <span>Settled: ${groupBalances.settled.toFixed(2)}</span>
                              <span>Remaining: ${groupBalances.remaining.toFixed(2)}</span>
                          </div>
                      </div>
                      <div className="mt-6 flex gap-2">
                          <AlertDialogTrigger asChild>
                              <Button className="w-full">Simplify Debts</Button>
                          </AlertDialogTrigger>
                          <Button variant="outline" className="w-full" disabled>Settle All</Button>
                      </div>
                  </CardContent>
              </Card>

              <Tabs defaultValue="expenses" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="expenses">Expenses</TabsTrigger>
                      <TabsTrigger value="members">Members</TabsTrigger>
                      <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  <TabsContent value="expenses">
                    <GroupExpenses groupId={group.id} />
                  </TabsContent>
                  <TabsContent value="members">
                      <GroupMembers group={group} isOwner={isOwner} />
                  </TabsContent>
                  <TabsContent value="stats">
                      <GroupStats groupId={group.id} />
                  </TabsContent>
              </Tabs>
          </main>
        </div>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Simplify Group Debts?</AlertDialogTitle>
            <AlertDialogDescription>
                This feature is coming soon! It will calculate the minimum number of payments needed for everyone in the group to settle up their balances.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Got it</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  );
}
