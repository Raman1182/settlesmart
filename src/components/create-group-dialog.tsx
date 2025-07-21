
"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Plus, PlusCircle, Users, X } from "lucide-react";
import { Badge } from "./ui/badge";

export function CreateGroupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const { createGroup, currentUser } = useSettleSmart();
  const { toast } = useToast();

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
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">Create Group</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>
            Create a group to start sharing expenses for trips, your home, or anything else.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Group Name
            </Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Trip to Bali"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="members" className="text-right">
              Members
            </Label>
            <div className="col-span-3">
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
                <p className="text-xs text-muted-foreground mt-1">Add members by their email address.</p>
            </div>
          </div>
           {memberEmails.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
                <div className="text-right text-sm font-medium col-start-1 mt-2">Invited</div>
                <div className="col-span-3 flex flex-wrap gap-2">
                    {memberEmails.map(email => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-1">
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
