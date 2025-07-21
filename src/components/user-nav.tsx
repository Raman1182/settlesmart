
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettleSmart } from "@/context/settle-smart-context";
import { Settings, User as UserIcon, Award, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { useMemo } from "react";

export function UserNav() {
  const { currentUser, expenses, balances } = useSettleSmart();

  const userBadge = useMemo(() => {
    if (!currentUser) return null;

    const totalPaid = expenses
        .filter(e => e.paidById === currentUser.id)
        .reduce((acc, e) => acc + e.amount, 0);

    if (totalPaid > 20000) {
        return { name: "Big Spender", icon: <Award className="h-3 w-3" /> };
    }

    if (balances.totalOwedToUser > balances.totalOwedByUser && balances.totalOwedToUser > 100) {
        return { name: "Early Bird", icon: <TrendingUp className="h-3 w-3" /> };
    }

    if (balances.totalOwedByUser > balances.totalOwedToUser && balances.totalOwedByUser > 1000) {
        return { name: "Always Owes", icon: <TrendingDown className="h-3 w-3" /> };
    }
    
    return null;
  }, [currentUser, expenses, balances]);

  if (!currentUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userBadge && (
             <DropdownMenuItem disabled>
                <div className="flex items-center gap-2">
                    {userBadge.icon}
                    <span>{userBadge.name}</span>
                </div>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
           <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
