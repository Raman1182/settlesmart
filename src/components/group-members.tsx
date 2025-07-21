
"use client";

import { useState, useMemo, useTransition } from "react";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Loader2, Plus, Trash2, User, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Group } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface GroupMembersProps {
    group: Group;
    isOwner: boolean;
}

export function GroupMembers({ group, isOwner }: GroupMembersProps) {
  const { findUserById, currentUser, isAuthLoading, updateGroupMembers, deleteGroup, leaveGroup, getGroupBalances } = useSettleSmart();
  const { toast } = useToast();

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isUpdating, startUpdateTransition] = useTransition();

  const groupMembers = useMemo(() => {
    return group?.members.map(id => findUserById(id)).filter(Boolean) as any[] || [];
  }, [group, findUserById]);
  
  const groupBalances = useMemo(() => {
    return getGroupBalances(group.id);
  }, [group.id, getGroupBalances]);
  
  const handleAddMember = () => {
    if (!newMemberEmail || groupMembers.some(m => m.email === newMemberEmail)) {
        toast({ variant: "destructive", title: "Invalid or duplicate email.", description: "They're probably already in here." });
        return;
    }
    startUpdateTransition(async () => {
        try {
            await updateGroupMembers(group.id, [newMemberEmail], []);
            toast({ title: "Member Added", description: `${newMemberEmail} has been invited. Let's see if they accept.`});
            setNewMemberEmail("");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error adding member", description: "Couldn't add them. Skill issue?" });
        }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === group.createdBy) {
        toast({ variant: "destructive", title: "Can't remove owner", description: "You can't kick out the person who started the group. That's just rude." });
        return;
    }
     if (memberId === currentUser?.id) {
        toast({ variant: "destructive", title: "Can't remove yourself", description: "To leave a group, use the 'Leave Group' option. Don't be dramatic." });
        return;
    }
    startUpdateTransition(async () => {
        try {
            await updateGroupMembers(group.id, [], [memberId]);
            toast({ title: "Member Removed.", description: "They have been yeeted from the group." });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Couldn't remove.", description: "Something went wrong. They're still here. Awkward." });
        }
    });
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Group Members</CardTitle>
            <CardDescription>Manage who's in this group. {isOwner && "As the owner, you hold all the power."}</CardDescription>
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
                    {groupMembers.map(member => {
                        const balance = groupBalances.memberBalances[member.id] || 0;
                        return (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={member.avatar} alt={member.name}/>
                                        <AvatarFallback>{member.initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{member.name} {member.id === currentUser?.id && <span className="text-muted-foreground">(You)</span>}</p>
                                        <p className={`text-sm font-semibold ${balance > 0 ? 'text-green-500' : balance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {balance > 0 ? `Owed ${formatCurrency(balance)}` : balance < 0 ? `Owes ${formatCurrency(Math.abs(balance))}` : 'Settled up'}
                                        </p>
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
                        )
                    })}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}

    
