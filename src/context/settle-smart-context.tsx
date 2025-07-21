
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";

import type { User, Group, Expense, Participant, UnequalSplit, ChecklistItem } from "@/lib/types";
import { users as mockUsers, groups as mockGroups, expenses as mockExpenses } from '@/lib/data';

interface AddExpenseData {
  description: string;
  amount: number;
  paidById: string;
  splitWith: Participant[];
  splitType: 'equally' | 'unequally';
  unequalSplits?: UnequalSplit[];
  groupId: string | null;
  category: string;
  isRecurring: boolean;
}

interface SettleSmartContextType {
  currentUser: User | null;
  isLoading: boolean;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  addExpense: (expense: AddExpenseData) => void;
  balances: {
    totalOwedToUser: number;
    totalOwedByUser: number;
    settlements: { from: User | {id: string, name: string, avatar?: string, initials: string}; to: User | {id: string, name: string, avatar?: string, initials: string}; amount: number }[];
  };
  getGroupBalances: (groupId: string) => { 
      total: number, 
      settled: number, 
      remaining: number, 
      progress: number,
      memberBalances: { [key: string]: number } 
  };
  findUserById: (id: string) => User | undefined;
  createGroup: (name: string, memberEmails: string[]) => Promise<void>;
  updateGroupMembers: (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  groupChecklists: { [groupId: string]: ChecklistItem[] };
  updateGroupChecklist: (groupId: string, items: ChecklistItem[]) => void;
  settleFriendDebt: (friendId: string) => Promise<void>;
  simplifyGroupDebts: (groupId: string) => { from: User, to: User, amount: number }[];
  settleAllInGroup: (groupId: string) => void;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupChecklists, setGroupChecklists] = useState<{ [groupId: string]: ChecklistItem[] }>({});

  useEffect(() => {
    // Simulate loading static mock data once
    setUsers(mockUsers);
    setGroups(mockGroups);
    setExpenses(mockExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            // In a real app, you would fetch the user profile from Firestore.
            // Here, we'll find the user in our mock data by email.
            const existingUser = mockUsers.find(u => u.email === user.email);
            if (existingUser) {
              // Simulate this user being logged in
              setCurrentUser({ ...existingUser, id: user.uid });
            } else {
              // Handle new user creation (or user not in mock data)
              const newUser: User = {
                id: user.uid,
                email: user.email!,
                name: user.email!.split('@')[0],
                avatar: `https://placehold.co/100x100?text=${user.email!.charAt(0).toUpperCase()}`,
                initials: user.email!.charAt(0).toUpperCase(),
              };
              setUsers(prev => [...prev, newUser]);
              setCurrentUser(newUser);
            }
        } else {
            setCurrentUser(null);
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  }
  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  }
  const signOut = () => {
    return firebaseSignOut(auth);
  }


  const findUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  const addExpense = (expenseData: AddExpenseData) => {
     if (!currentUser) throw new Error("No user found");
    const newExpense: Expense = {
      id: `exp-${new Date().getTime()}`,
      ...expenseData,
      date: new Date().toISOString(),
      isRecurring: expenseData.isRecurring || false,
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
        } else {
          // For now, we'll just add new ad-hoc users to the main user list for simplicity in this demo
          const newId = `user-${new Date().getTime()}-${Math.random()}`;
          const newUser: User = {
            id: newId,
            name: email.split('@')[0],
            email: email,
            avatar: `https://placehold.co/100x100?text=${email.charAt(0).toUpperCase()}`,
            initials: email.charAt(0).toUpperCase(),
          };
          setUsers(prev => [...prev, newUser]);
          memberIds.add(newId);
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
  
  const deleteGroup = async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    // Also delete associated expenses
    setExpenses(prev => prev.filter(e => e.groupId !== groupId));
  };
  
  const leaveGroup = async (groupId: string) => {
     if (!currentUser) throw new Error("Not authenticated");
     setGroups(prev => prev.map(g => {
       if (g.id === groupId) {
         return {
           ...g,
           members: g.members.filter(mId => mId !== currentUser.id)
         }
       }
       return g;
     }));
  };
  
  const updateGroupChecklist = (groupId: string, items: ChecklistItem[]) => {
    setGroupChecklists(prev => ({
        ...prev,
        [groupId]: items,
    }));
  };
  
  const settleFriendDebt = async (friendId: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    // In a real app, this would be more complex, likely creating a settlement transaction.
    // This mock implementation removes expenses that are *only* between these two users.
    const expensesToRemove = expenses.filter(e => {
        const participants = new Set(e.splitWith);
        return participants.size === 2 && participants.has(currentUser.id) && participants.has(friendId);
    });

    setExpenses(prev => prev.filter(e => !expensesToRemove.some(er => er.id === e.id)));
  }
  
  const settleAllInGroup = (groupId: string) => {
    // This simply removes all expenses associated with the group to clear the balance.
    setExpenses(prev => prev.filter(e => e.groupId !== groupId));
  };

  const calculateSettlements = useCallback((expensesToCalculate: Expense[], allParticipants: Participant[]) => {
    const userBalances: { [key: string]: number } = {};
    allParticipants.forEach(p => userBalances[p] = 0);

    expensesToCalculate.forEach(expense => {
        const participantsInThisExpense = expense.splitWith.filter(p => allParticipants.includes(p));
        if (participantsInThisExpense.length === 0) return;

        if(!userBalances[expense.paidById]) userBalances[expense.paidById] = 0;
        userBalances[expense.paidById] += expense.amount;

        if (expense.splitType === 'unequally' && expense.unequalSplits) {
            expense.unequalSplits.forEach(split => {
                if(!userBalances[split.participantId]) userBalances[split.participantId] = 0;
                userBalances[split.participantId] -= split.amount;
            });
        } else {
            const share = expense.amount / participantsInThisExpense.length;
            participantsInThisExpense.forEach(participantId => {
                if(!userBalances[participantId]) userBalances[participantId] = 0;
                userBalances[participantId] -= share;
            });
        }
    });
    return userBalances;
  }, []);
  
  const getAllParticipants = useMemo(() => {
    const all = new Set<Participant>(users.map(u => u.id));
    expenses.forEach(e => {
        e.splitWith.forEach(p => all.add(p));
    });
    return Array.from(all);
  }, [users, expenses]);

  const getGroupBalances = useCallback((groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return { total: 0, settled: 0, remaining: 0, progress: 0, memberBalances: {} };
      
      const groupExpenses = expenses.filter(e => e.groupId === groupId);
      const total = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

      const memberBalances = calculateSettlements(groupExpenses, group.members);
      
      const totalPositive = Object.values(memberBalances).filter(v => v > 0).reduce((s, v) => s + v, 0);
      const remaining = totalPositive;
      const settled = total > 0 ? Math.max(0, total - remaining) : total;
      const progress = total > 0 ? (settled / total) * 100 : 100;

      return { total, settled, remaining, progress, memberBalances };

  }, [groups, expenses, calculateSettlements]);
  
    const simplifyDebts = useCallback((userBalances: { [key: string]: number }) => {
        const settlements: { from: string, to: string, amount: number }[] = [];
        const payers = Object.entries(userBalances).filter(([,amount]) => amount > 0.01);
        const owers = Object.entries(userBalances).filter(([,amount]) => amount < -0.01);

        payers.sort((a, b) => a[1] - b[1]);
        owers.sort((a, b) => a[1] - b[1]);

        let i = 0, j = 0;
        while (i < payers.length && j < owers.length) {
            const [payerId, credit] = payers[i];
            const [owerId, debt] = owers[j];
            const settlementAmount = Math.min(credit, -debt);

            if (settlementAmount > 0.01) {
                settlements.push({ from: owerId, to: payerId, amount: settlementAmount });
                payers[i][1] -= settlementAmount;
                owers[j][1] += settlementAmount;
            }

            if (payers[i][1] < 0.01) i++;
            if (owers[j][1] > -0.01) j++;
        }
        return settlements;
    }, []);

    const simplifyGroupDebts = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupExpenses = expenses.filter(e => e.groupId === groupId);
        const memberBalances = calculateSettlements(groupExpenses, group.members);
        
        return simplifyDebts(memberBalances)
            .map(s => {
                const fromUser = findUserById(s.from);
                const toUser = findUserById(s.to);
                if (!fromUser || !toUser) return null;
                return { from: fromUser, to: toUser, amount: s.amount };
            })
            .filter(Boolean) as { from: User, to: User, amount: number }[];
    }, [groups, expenses, calculateSettlements, simplifyDebts, findUserById]);
  
  const balances = useMemo(() => {
    if (!currentUser) {
        return { totalOwedToUser: 0, totalOwedByUser: 0, settlements: [] };
    }
    const userBalances = calculateSettlements(expenses, getAllParticipants);
    const finalSettlements = simplifyDebts(userBalances)
        .map(debt => {
            const fromUser = findUserById(debt.from);
            const toUser = findUserById(debt.to);
            return {
                from: fromUser || {id: debt.from, name: debt.from, initials: debt.from.charAt(0).toUpperCase()},
                to: toUser || {id: debt.to, name: debt.to, initials: debt.to.charAt(0).toUpperCase()},
                amount: debt.amount
            }
        });

    return {
      totalOwedToUser: finalSettlements.filter(s => s.to?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0),
      totalOwedByUser: finalSettlements.filter(s => s.from?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0),
      settlements: finalSettlements
    };
  }, [expenses, currentUser, findUserById, calculateSettlements, getAllParticipants, simplifyDebts]);


  const value = {
    currentUser,
    isLoading,
    users,
    groups,
    expenses,
    addExpense,
    balances,
    getGroupBalances,
    findUserById,
    createGroup,
    updateGroupMembers,
    deleteGroup,
    leaveGroup,
    groupChecklists,
    updateGroupChecklist,
    settleFriendDebt,
    simplifyGroupDebts,
    settleAllInGroup,
    signUp,
    signIn,
    signOut,
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
