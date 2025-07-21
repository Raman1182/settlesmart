"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { User, Group, Expense, Balance } from "@/lib/types";
import { users as mockUsers, groups as mockGroups, expenses as mockExpenses } from "@/lib/data";

interface SettleSmartContextType {
  currentUser: User;
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
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  
  const currentUser = users[0];

  const findUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp${Date.now()}`,
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev]);
  };
  
  const balances = useMemo(() => {
    const balancesByUser: Record<string, Record<string, number>> = {};
    users.forEach(user => {
      balancesByUser[user.id] = {};
    });

    expenses.forEach(expense => {
        const share = expense.amount / expense.splitWith.length;
        expense.splitWith.forEach(memberId => {
            if(memberId !== expense.paidById) {
                if(!balancesByUser[memberId]) balancesByUser[memberId] = {};
                balancesByUser[memberId][expense.paidById] = (balancesByUser[memberId][expense.paidById] || 0) + share;

                if(!balancesByUser[expense.paidById]) balancesByUser[expense.paidById] = {};
                balancesByUser[expense.paidById][memberId] = (balancesByUser[expense.paidById][memberId] || 0) - share;
            }
        });
    });

    const simplifiedDebts: { from: string; to: string; amount: number }[] = [];
    const userPairs = new Set<string>();

    users.forEach(u1 => {
        users.forEach(u2 => {
            if (u1.id === u2.id) return;

            const pairKey = [u1.id, u2.id].sort().join('-');
            if(userPairs.has(pairKey)) return;
            userPairs.add(pairKey);

            const u1OwesU2 = balancesByUser[u1.id]?.[u2.id] || 0;
            const u2OwesU1 = balancesByUser[u2.id]?.[u1.id] || 0;

            if (u1OwesU2 > u2OwesU1) {
                simplifiedDebts.push({ from: u1.id, to: u2.id, amount: u1OwesU2 - u2OwesU1 });
            } else if (u2OwesU1 > u1OwesU2) {
                simplifiedDebts.push({ from: u2.id, to: u1.id, amount: u2OwesU1 - u1OwesU2 });
            }
        });
    });
    
    const settlements = simplifiedDebts
        .map(debt => ({
            from: findUserById(debt.from)!,
            to: findUserById(debt.to)!,
            amount: debt.amount
        }))
        .filter(s => s.from && s.to);

    return {
      totalOwedToUser: settlements.filter(s => s.to.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
      totalOwedByUser: settlements.filter(s => s.from.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
      settlements
    };
  }, [expenses, users, currentUser, findUserById]);


  return (
    <SettleSmartContext.Provider value={{ currentUser, users, groups, expenses, addExpense, balances, findUserById }}>
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
