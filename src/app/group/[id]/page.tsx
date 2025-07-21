
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Header } from "@/components/header";
import { Loader2, Plus, Trash2, User, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function GroupSettingsPage() {
  const { id: groupId } = useParams();
  const router = useRouter();
  const { groups, findUserById, currentUser, isLoading: isAuthLoading, updateGroupMembers, deleteGroup, leaveGroup } = useSettleSmart();
  const { toast } = useToast();

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isUpdating, startUpdateTransition] = useTransition();

  const group = useMemo(() => groups.find(g => g.id === groupId), [groups, groupId]);

  const groupMembers = useMemo(() => {
    return group?.members.map(id => findUserById(id)).filter(Boolean) as any[] || [];
  }, [group, findUserById]);
  
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

  const handleAddMember = () => {
    if (!newMemberEmail || groupMembers.some(m => m.email === newMemberEmail)) {
        toast({ variant: "destructive", title: "Invalid or duplicate email." });
        return;
    }
    startUpdateTransition(async () => {
        try {
            await updateGroupMembers(group.id, [newMemberEmail], []);
            toast({ title: "Member Added", description: `${newMemberEmail} has been invited to the group.`});
            setNewMemberEmail("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === group.createdBy) {
        toast({ variant: "destructive", title: "Cannot remove owner", description: "The group creator cannot be removed." });
        return;
    }
     if (memberId === currentUser?.id) {
        toast({ variant: "destructive", title: "Cannot remove yourself", description: "To leave a group, use the 'Leave Group' option." });
        return;
    }
    startUpdateTransition(async () => {
        try {
            await updateGroupMembers(group.id, [], [memberId]);
            toast({ title: "Member Removed" });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        }
    });
  };

  const handleDeleteGroup = () => {
    startUpdateTransition(async () => {
      try {
        await deleteGroup(group.id);
        toast({ title: "Group Deleted" });
        router.push('/groups');
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
  }
  
  const handleLeaveGroup = () => {
     startUpdateTransition(async () => {
      try {
        await leaveGroup(group.id);
        toast({ title: "You have left the group" });
        router.push('/groups');
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    });
  }


  return (
    <div className="flex flex-col min-h-screen w-full">
        <Header pageTitle={`Group: ${group.name}`} />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:gap-8 md:p-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Group Members</CardTitle>
                        <CardDescription>Manage who is in this group. {isOwner && "As the owner, you can add or remove members."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isOwner && (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="friend@example.com"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        disabled={isUpdating}
                                    />
                                    <Button onClick={handleAddMember} disabled={isUpdating || !newMemberEmail}>
                                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4"/>}
                                        Add
                                    </Button>
                                </div>
                            )}
                            <div className="space-y-3">
                                {groupMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={member.avatar} alt={member.name}/>
                                                <AvatarFallback>{member.initials}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name} {member.id === currentUser?.id && '(You)'}</p>
                                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                            </div>
                                             {member.id === group.createdBy && <Badge variant="secondary">Owner</Badge>}
                                        </div>
                                        {isOwner && member.id !== currentUser?.id && member.id !== group.createdBy && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={isUpdating}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle>Group Settings</CardTitle>
                        <CardDescription>Advanced settings for this group.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!isOwner && (
                            <div>
                                <h4 className="font-medium mb-2">Leave Group</h4>
                                <p className="text-sm text-muted-foreground mb-3">If you leave this group, you won't be able to see its expenses. This action cannot be undone.</p>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full" disabled={isUpdating}>Leave Group</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. You will be removed from the group and will lose access to its expense history.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLeaveGroup} className="bg-primary hover:bg-primary/90">Leave</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                         {isOwner && (
                             <div className="!mt-6">
                                <h4 className="font-medium mb-2 text-destructive">Delete Group</h4>
                                <p className="text-sm text-muted-foreground mb-3">Deleting the group will permanently remove all associated expenses and balances. This action cannot be undone.</p>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full" disabled={isUpdating}>Delete Group</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the
                                            <span className="font-bold"> {group.name} </span> group and all of its data.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteGroup}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </main>
      </div>
  );
}
