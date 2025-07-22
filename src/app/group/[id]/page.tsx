
"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Loader2, Users, ArrowLeft, Settings, Trash2, LogOut, Loader, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupMembers } from "@/components/group-members";
import { GroupExpenses } from "@/components/group-expenses";
import { GroupStats } from "@/components/group-stats";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GroupChecklist } from "@/components/group-checklist";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import type { User, Group } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function GroupDetailsPage() {
  const { id: groupId } = useParams();
  const router = useRouter();
  const { groups, findUserById, currentUser, isAuthLoading, getGroupBalances, deleteGroup, leaveGroup, simplifyGroupDebts, settleAllInGroup } = useSettleSmart();
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isLeaving, startLeaveTransition] = useTransition();

  const group = useMemo(() => groups.find(g => g.id === groupId), [groups, groupId]);

  const groupBalances = useMemo(() => {
    if (!group) return { total: 0, settled: 0, remaining: 0, progress: 0, memberBalances: {} };
    return getGroupBalances(group.id);
  }, [group, getGroupBalances]);
  
  const simplifiedDebts = useMemo(() => {
    if (!group) return [];
    return simplifyGroupDebts(group.id);
  }, [group, simplifyGroupDebts]);

  const handleDeleteGroup = () => {
    if (!group) return;
    startDeleteTransition(async () => {
      try {
        await deleteGroup(group.id);
        toast({ title: "Group Deleted.", description: `The "${group.name}" group is officially history.` });
        router.push('/groups');
      } catch (error: any) {
        toast({ variant: "destructive", title: "Can't delete.", description: "Something went wrong. The group lives on." });
      }
    });
  }

  const handleLeaveGroup = () => {
    if (!group) return;
    startLeaveTransition(async () => {
        try {
            await leaveGroup(group.id);
            toast({ title: "You've left the group", description: `You are no longer a member of "${group.name}". Peace out!`});
            router.push('/groups');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Can't leave rn.", description: "The app is weirdly attached to you. Try again." });
        }
    })
  }

  const handleSettleAll = () => {
    if (!group) return;
    settleAllInGroup(group.id);
    toast({ title: "Boom! All Settled.", description: `All debts in ${group.name} have been cleared. We're all even.` });
  }
  
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
                  <h1 className="text-xl md:text-2xl font-bold flex-1 font-heading">{group.name}</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isOwner && (
                            <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Delete Group</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure about this?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This cannot be undone. It will permanently delete the <strong>{group.name}</strong> group and all its expenses. Like, forever forever.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Yes, delete it
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                             <DropdownMenuSeparator />
                            </>
                        )}
                        <AlertDialog>
                             <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Leave Group</span>
                                </DropdownMenuItem>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Dip out of "{group.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You won't be a member anymore. You can only rejoin if the owner is cool enough to invite you back.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLeaveGroup}>
                                            {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Yes, I'm out
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                              <span>Settled: {formatCurrency(groupBalances.settled)}</span>
                              <span>Remaining: {formatCurrency(groupBalances.remaining)}</span>
                          </div>
                      </div>
                      <div className="mt-6 flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full">Simplify Debts</Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Simplified Group Debts</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Here's the fastest way for everyone to get square. No more messy chains of payments.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-4 py-4">
                                    {simplifiedDebts.length === 0 && <p className="text-center text-muted-foreground">Everyone is settled up! The vibes are immaculate.</p>}
                                    {simplifiedDebts.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={s.from.avatar} />
                                                    <AvatarFallback>{s.from.initials}</AvatarFallback>
                                                </Avatar>
                                                <span>{s.from.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-primary font-mono">
                                                <ArrowRight className="h-4 w-4" />
                                                <span>{formatCurrency(s.amount)}</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={s.to.avatar} />
                                                    <AvatarFallback>{s.to.initials}</AvatarFallback>
                                                </Avatar>
                                                <span>{s.to.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Got it</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="outline" className="w-full">Settle All</Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Settle all debts in {group.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This marks everything as settled. Assumes everyone paid up offline. No backsies.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Nvm</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSettleAll}>Confirm & Settle</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </CardContent>
              </Card>

              <Tabs defaultValue="expenses" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="expenses">Expenses</TabsTrigger>
                      <TabsTrigger value="checklist">Checklist</TabsTrigger>
                      <TabsTrigger value="members">Members</TabsTrigger>
                      <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  <TabsContent value="expenses">
                    <GroupExpenses groupId={group.id} />
                  </TabsContent>
                   <TabsContent value="checklist">
                    <GroupChecklist group={group} />
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
  );
}
