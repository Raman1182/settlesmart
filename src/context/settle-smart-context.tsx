
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import type { User, Group, Expense } from "@/lib/types";
import { users as mockUsers, groups as mockGroups, expenses as mockExpenses } from '@/lib/data';

interface SettleSmartContextType {
  currentUser: User | null;
  isLoading: boolean;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  balances: {
    totalOwedToUser: number;
    totalOwedByUser: number;
    settlements: { from: User; to: User; amount: number }[];
  };
  findUserById: (id: string) => User | undefined;
  createGroup: (name: string, memberEmails: string[]) => Promise<void>;
  updateGroupMembers: (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => Promise<void>;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    // Simulate loading mock data
    setIsLoading(true);
    setCurrentUser(mockUsers[0]);
    setUsers(mockUsers);
    
    // Simulate group and expense data for the current user
    const userGroups = mockGroups.filter(g => g.members.includes(mockUsers[0].id));
    setGroups(userGroups);
    
    const userGroupIds = userGroups.map(g => g.id);
    const userExpenses = mockExpenses
      .filter(e => userGroupIds.includes(e.groupId))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(userExpenses);
    
    setIsLoading(false);
  }, []);

  const findUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
     if (!currentUser) throw new Error("No user found");
    const newExpense: Expense = {
      id: `exp-${new Date().getTime()}`,
      ...expenseData,
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const createGroup = async (name: string, memberEmails: string[]) => {
      if (!currentUser) throw new Error("Not authenticated");
      const memberIds = new Set<string>([currentUser.id]);
      
      memberEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          memberIds.add(user.id);
        }
      });
      
      const newGroup: Group = {
        id: `group-${new Date().getTime()}`,
        name,
        members: Array.from(memberIds),
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      
      setGroups(prev => [...prev, newGroup]);
  };

  const updateGroupMembers = async (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => {
      const membersToAddIds = users.filter(u => memberEmailsToAdd.includes(u.email)).map(u => u.id);

      setGroups(prevGroups => prevGroups.map(group => {
        if (group.id === groupId) {
          const newMembers = new Set(group.members);
          membersToAddIds.forEach(id => newMembers.add(id));
          memberIdsToRemove.forEach(id => newMembers.delete(id));
          return { ...group, members: Array.from(newMembers) };
        }
        return group;
      }));
  };

  
  const balances = useMemo(() => {
    if (!currentUser || !users.length) {
        return { totalOwedToUser: 0, totalOwedByUser: 0, settlements: [] };
    }
    const userBalances: { [key: string]: number } = {};

    users.forEach(user => {
        userBalances[user.id] = 0;
    });

    expenses.forEach(expense => {
        const numParticipants = expense.splitWith.length;
        if (numParticipants === 0) return;

        const share = expense.amount / numParticipants;

        if(!userBalances[expense.paidById]) userBalances[expense.paidById] = 0;
        userBalances[expense.paidById] += expense.amount;

        expense.splitWith.forEach(participantId => {
            if(!userBalances[participantId]) userBalances[participantId] = 0;
            userBalances[participantId] -= share;
        });
    });

    const settlements: { from: string, to: string, amount: number }[] = [];
    const payers = Object.keys(userBalances).filter(id => userBalances[id] > 0.01);
    const owers = Object.keys(userBalances).filter(id => userBalances[id] < -0.01);

    let i = 0, j = 0;
    while (i < payers.length && j < owers.length) {
        const payerId = payers[i];
        const owerId = owers[j];
        const credit = userBalances[payerId];
        const debt = -userBalances[owerId];

        const settlementAmount = Math.min(credit, debt);

        if (settlementAmount > 0.01) { 
            settlements.push({ from: owerId, to: payerId, amount: settlementAmount });

            userBalances[payerId] -= settlementAmount;
            userBalances[owerId] += settlementAmount;
        }

        if (userBalances[payerId] < 0.01) i++;
        if (userBalances[owerId] > -0.01) j++;
    }

    const finalSettlements = settlements
        .map(debt => ({
            from: findUserById(debt.from)!,
            to: findUserById(debt.to)!,
            amount: debt.amount
        }))
        .filter(s => s.from && s.to);

    return {
      totalOwedToUser: finalSettlements.filter(s => s.to?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0),
      totalOwedByUser: finalSettlements.filter(s => s.from?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0),
      settlements: finalSettlements
    };
  }, [expenses, users, currentUser, findUserById]);


  const value = {
    currentUser,
    isLoading,
    users,
    groups,
    expenses,
    addExpense,
    balances,
    findUserById,
    createGroup,
    updateGroupMembers,
  };

  return (
    <SettleSmartContext.Provider value={value}>
      {children}
    </SettleSmartContext.Provider>
  );
};

export const useSettleSmart = (): SettleSmartContextType => {
  const context = useContext(SettleSmartContext);
  if (context === undefined) {
    throw new Error("useSettleSmart must be used within a SettleSmartProvider");
  }
  return context;
};
