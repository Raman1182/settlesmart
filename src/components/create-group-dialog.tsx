
"use client";

import { useState, useTransition, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettleSmart } from "@/context/settle-smart-context";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Users, X } from "lucide-react";
import { Badge } from "./ui/badge";

interface CreateGroupDialogProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateGroupDialog({ children, open, onOpenChange }: CreateGroupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const { createGroup, currentUser } = useSettleSmart();
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const handleAddMember = () => {
    if (memberEmail && !memberEmails.includes(memberEmail) && memberEmail !== currentUser?.email) {
      setMemberEmails([...memberEmails, memberEmail]);
      setMemberEmail("");
    } else if(memberEmail === currentUser?.email) {
        toast({
            variant: "destructive",
            title: "You are already a member",
            description: "You are automatically included in any group you create.",
        });
    } else {
         toast({
            variant: "destructive",
            title: "Invalid Email",
            description: "Please enter a valid, unique email address.",
        });
    }
  };
  
  const handleRemoveMember = (emailToRemove: string) => {
    setMemberEmails(memberEmails.filter(email => email !== emailToRemove));
  };
  
  const resetForm = () => {
      setGroupName("");
      setMemberEmail("");
      setMemberEmails([]);
  }

  const handleSubmit = () => {
    if (!groupName) {
        toast({ variant: "destructive", title: "Group name is required." });
        return;
    }
    startSubmittingTransition(async () => {
      try {
        await createGroup(groupName, memberEmails);
        toast({
          title: "Group Created",
          description: `The group "${groupName}" has been successfully created.`,
        });
        resetForm();
        setIsOpen(false);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error Creating Group",
          description: error.message || "Something went wrong. Please try again.",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetForm();
        setIsOpen(open);
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Create a group to start sharing expenses for trips, your home, or anything else.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Group Name
            </Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Trip to Bali"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="members">
              Invite Members
            </Label>
            <div className="flex gap-2">
                <Input
                id="members"
                type="email"
                placeholder="friend@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                    }
                }}
                />
                <Button type="button" size="icon" variant="outline" onClick={handleAddMember}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>
          </div>
           {(memberEmails.length > 0 || currentUser) && (
            <div>
                <Label>Members</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {currentUser && <Badge variant="secondary">{currentUser.email} (You)</Badge>}
                    {memberEmails.map(email => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                            {email}
                            <button onClick={() => handleRemoveMember(email)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                <X className="h-3 w-3"/>
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
           )}

        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
