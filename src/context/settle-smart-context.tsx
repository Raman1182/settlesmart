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
    setExpenses(prev => [newExpense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const balances = useMemo(() => {
    const userBalances: { [key: string]: number } = {};

    users.forEach(user => {
        userBalances[user.id] = 0;
    });

    expenses.forEach(expense => {
        const numParticipants = expense.splitWith.length;
        if (numParticipants === 0) return;

        const share = expense.amount / numParticipants;

        userBalances[expense.paidById] += expense.amount;

        expense.splitWith.forEach(participantId => {
            userBalances[participantId] -= share;
        });
    });

    const settlements: { from: string, to: string, amount: number }[] = [];
    const payers = Object.keys(userBalances).filter(id => userBalances[id] > 0);
    const owers = Object.keys(userBalances).filter(id => userBalances[id] < 0);

    let i = 0, j = 0;
    while (i < payers.length && j < owers.length) {
        const payerId = payers[i];
        const owerId = owers[j];
        const credit = userBalances[payerId];
        const debt = -userBalances[owerId];

        const settlementAmount = Math.min(credit, debt);

        if (settlementAmount > 0.01) { // Threshold to avoid tiny settlements
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
      totalOwedToUser: finalSettlements.filter(s => s.to.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
      totalOwedByUser: finalSettlements.filter(s => s.from.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
      settlements: finalSettlements
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
