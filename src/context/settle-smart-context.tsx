
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";

import type { User, Group, Expense, Participant, UnequalSplit, ChecklistItem, Message } from "@/lib/types";
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
  messages: Message[];
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
  sendMessage: (receiverId: string, text: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  addAdHocUser: (email: string) => void;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

// A simple in-memory store to persist data across "logins" in the mock environment
const appDataStore = {
  users: [...mockUsers],
  groups: [...mockGroups],
  expenses: [...mockExpenses],
  groupChecklists: {} as { [groupId: string]: ChecklistItem[] }
};


export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>(appDataStore.users);
  const [groups, setGroups] = useState<Group[]>(appDataStore.groups);
  const [expenses, setExpenses] = useState<Expense[]>(appDataStore.expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const [groupChecklists, setGroupChecklists] = useState<{ [groupId: string]: ChecklistItem[] }>(appDataStore.groupChecklists);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            let existingUser = appDataStore.users.find(u => u.id === user.uid || u.email === user.email);
            if (existingUser) {
              // Ensure user has firebase uid
              if (existingUser.id !== user.uid) {
                existingUser.id = user.uid;
              }
              setCurrentUser(existingUser);
            } else {
              const newUser: User = {
                id: user.uid,
                email: user.email!,
                name: user.email!.split('@')[0],
                avatar: `https://placehold.co/100x100?text=${user.email!.charAt(0).toUpperCase()}`,
                initials: user.email!.charAt(0).toUpperCase(),
              };
              appDataStore.users.push(newUser);
              setCurrentUser(newUser);
            }
            // Always refresh users from the "global" store on auth change
            setUsers([...appDataStore.users]);
        } else {
            setCurrentUser(null);
        }
        setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
        setMessages([]);
        return;
    };

    const q = query(collection(db, "messages"), where("receiverId", "==", currentUser.id));
    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
        const receivedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            receivedMessages.push({ 
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
            } as Message);
        });
        setMessages(receivedMessages.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    
    return () => unsubscribeMessages();
  }, [currentUser]);


  const signUp = async (email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    // After signup, a new user is created in Firebase Auth.
    // The onAuthStateChanged listener will fire, creating the user in our mock store.
    // We explicitly set the user list state again here to ensure all components re-render with the new user.
    setUsers([...appDataStore.users]); 
    return result;
  }

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  }
  
  const signOut = () => {
    return firebaseSignOut(auth);
  }

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    await addDoc(collection(db, "messages"), {
      senderId: currentUser.id,
      receiverId,
      text,
      read: false,
      createdAt: serverTimestamp()
    });
  }
  
  const markMessageAsRead = async (messageId: string) => {
    const messageRef = doc(db, "messages", messageId);
    await updateDoc(messageRef, { read: true });
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
    appDataStore.expenses.push(newExpense);
    setExpenses(appDataStore.expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const addAdHocUser = (email: string) => {
    if (appDataStore.users.some(u => u.email === email)) {
        throw new Error("User with this email already exists.");
    }
    const newUser: User = {
        id: `user-${new Date().getTime()}-${Math.random()}`,
        name: email.split('@')[0],
        email: email,
        avatar: `https://placehold.co/100x100?text=${email.charAt(0).toUpperCase()}`,
        initials: email.charAt(0).toUpperCase(),
    };
    appDataStore.users.push(newUser);
    setUsers([...appDataStore.users]);
  }

  const createGroup = async (name: string, memberEmails: string[]) => {
      if (!currentUser) throw new Error("Not authenticated");
      const memberIds = new Set<string>([currentUser.id]);
      
      memberEmails.forEach(email => {
        let user = appDataStore.users.find(u => u.email === email);
        if (user) {
          memberIds.add(user.id);
        } else {
          // This logic is for ad-hoc (non-registered) members
          const newId = `user-${new Date().getTime()}-${Math.random()}`;
          const newUser: User = {
            id: newId,
            name: email.split('@')[0],
            email: email, // We can store the email to potentially link later
            avatar: `https://placehold.co/100x100?text=${email.charAt(0).toUpperCase()}`,
            initials: email.charAt(0).toUpperCase(),
          };
          appDataStore.users.push(newUser);
          setUsers([...appDataStore.users]);
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
      
      appDataStore.groups.push(newGroup);
      setGroups([...appDataStore.groups]);
  };

  const updateGroupMembers = async (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => {
      const membersToAddIds = users.filter(u => memberEmailsToAdd.includes(u.email)).map(u => u.id);
      
      const groupIndex = appDataStore.groups.findIndex(g => g.id === groupId);
      if (groupIndex > -1) {
          const newMembers = new Set(appDataStore.groups[groupIndex].members);
          membersToAddIds.forEach(id => newMembers.add(id));
          memberIdsToRemove.forEach(id => newMembers.delete(id));
          appDataStore.groups[groupIndex].members = Array.from(newMembers);
          setGroups([...appDataStore.groups]);
      }
  };
  
  const deleteGroup = async (groupId: string) => {
    appDataStore.groups = appDataStore.groups.filter(g => g.id !== groupId);
    appDataStore.expenses = appDataStore.expenses.filter(e => e.groupId !== groupId);
    setGroups(appDataStore.groups);
    setExpenses(appDataStore.expenses);
  };
  
  const leaveGroup = async (groupId: string) => {
     if (!currentUser) throw new Error("Not authenticated");
     const groupIndex = appDataStore.groups.findIndex(g => g.id === groupId);
      if (groupIndex > -1) {
          appDataStore.groups[groupIndex].members = appDataStore.groups[groupIndex].members.filter(mId => mId !== currentUser.id);
          setGroups([...appDataStore.groups]);
      }
  };
  
  const updateGroupChecklist = (groupId: string, items: ChecklistItem[]) => {
    appDataStore.groupChecklists[groupId] = items;
    setGroupChecklists({...appDataStore.groupChecklists});
  };
  
  const settleFriendDebt = async (friendId: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    const expensesToRemove = appDataStore.expenses.filter(e => {
        const participants = new Set(e.splitWith);
        return participants.size === 2 && participants.has(currentUser.id) && participants.has(friendId);
    });

    appDataStore.expenses = appDataStore.expenses.filter(e => !expensesToRemove.some(er => er.id === e.id));
    setExpenses(appDataStore.expenses);
  }
  
  const settleAllInGroup = (groupId: string) => {
    appDataStore.expenses = appDataStore.expenses.filter(e => e.groupId !== groupId);
    setExpenses(appDataStore.expenses);
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
    messages,
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
    sendMessage,
    markMessageAsRead,
    addAdHocUser,
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
