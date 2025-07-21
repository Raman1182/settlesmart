
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import type { User, Group, Expense } from "@/lib/types";
import { users as mockUsers, groups as mockGroups, expenses as mockExpenses } from "@/lib/data";
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, onSnapshot, arrayUnion, arrayRemove, DocumentReference } from "firebase/firestore";

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
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  createGroup: (name: string, memberEmails: string[]) => Promise<void>;
  updateGroupMembers: (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => Promise<void>;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const fetchUsers = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    // Deduplicate user IDs to fetch
    const userIdsToFetch = userIds.filter(id => !users.some(u => u.id === id));
    if (userIdsToFetch.length === 0) return;

    try {
      const usersQuery = query(collection(db, "users"), where("__name__", "in", [...new Set(userIdsToFetch)]));
      const querySnapshot = await getDocs(usersQuery);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      
      setUsers(prevUsers => {
          const newUsers = [...prevUsers];
          fetchedUsers.forEach(fetchedUser => {
              if(!newUsers.some(u => u.id === fetchedUser.id)) {
                  newUsers.push(fetchedUser);
              }
          });
          return newUsers;
      });

    } catch (error) {
        console.error("Error fetching user data:", error);
    }
  }, [users]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubUser = onSnapshot(userDocRef, (userDoc) => {
           if (userDoc.exists()) {
             const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
             setCurrentUser(userData);
             setUsers(prevUsers => {
                const userExists = prevUsers.some(u => u.id === userData.id);
                if (userExists) {
                    return prevUsers.map(u => u.id === userData.id ? userData : u);
                }
                return [...prevUsers, userData];
             });
           } else {
            // This case is unlikely if signup is handled correctly but good as a fallback.
            const name = firebaseUser.displayName || "New User";
            const newUser: User = {
                id: firebaseUser.uid,
                name,
                email: firebaseUser.email!,
                avatar: `https://placehold.co/100x100?text=${getInitials(name)}`,
                initials: getInitials(name),
            };
            setDoc(userDocRef, { name: newUser.name, email: newUser.email, avatar: newUser.avatar, initials: newUser.initials });
            setCurrentUser(newUser);
           }
           setIsLoading(false);
        });

        return () => unsubUser();
      } else {
        setCurrentUser(null);
        setGroups([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      const groupsQuery = query(collection(db, "groups"), where("members", "array-contains", currentUser.id));
      const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
        const userGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(userGroups);
        // When groups change, we might have new members whose user data we need to fetch
        const allMemberIds = userGroups.flatMap(g => g.members);
        fetchUsers(allMemberIds);
      });
      return () => unsubscribe();
    }
  }, [currentUser, fetchUsers]);


  const findUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp${Date.now()}`,
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const signup = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const initials = getInitials(name);
    const newUser: Omit<User, 'id'> = {
      name,
      email,
      avatar: `https://placehold.co/100x100?text=${initials}`,
      initials,
    };
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const updateUserProfile = async (data: Partial<Omit<User, 'id' | 'email'>>) => {
      if (!currentUser) throw new Error("Not authenticated");
      const userDocRef = doc(db, "users", currentUser.id);

      const updatedData: Partial<User> = { ...data };
      if (data.name) {
          updatedData.initials = getInitials(data.name);
      }
      
      await updateDoc(userDocRef, updatedData);
  };
  
  const createGroup = async (name: string, memberEmails: string[]) => {
      if (!currentUser) throw new Error("Not authenticated");

      const allEmails = [currentUser.email, ...memberEmails];
      const memberIds = new Set<string>([currentUser.id]);
      
      if (allEmails.length > 1) {
          const usersQuery = query(collection(db, "users"), where("email", "in", allEmails));
          const querySnapshot = await getDocs(usersQuery);
          querySnapshot.forEach((doc) => {
              memberIds.add(doc.id);
          });
      }
      
      const newGroupRef = doc(collection(db, "groups"));
      await setDoc(newGroupRef, {
          name,
          members: Array.from(memberIds),
          createdAt: serverTimestamp(),
          createdBy: currentUser.id,
      });
  };

  const updateGroupMembers = async (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => {
      const groupRef = doc(db, "groups", groupId);
      const membersToAddIds: string[] = [];

      if (memberEmailsToAdd.length > 0) {
          const usersQuery = query(collection(db, "users"), where("email", "in", memberEmailsToAdd));
          const querySnapshot = await getDocs(usersQuery);
          querySnapshot.forEach((doc) => {
              membersToAddIds.push(doc.id);
          });
      }

      const updatePayload: any = {};
      if (membersToAddIds.length > 0) {
          updatePayload.members = arrayUnion(...membersToAddIds);
      }
      if (memberIdsToRemove.length > 0) {
          if (!updatePayload.members) updatePayload.members = arrayRemove(...memberIdsToRemove);
          else {
              // This is more complex; Firestore doesn't support arrayUnion and arrayRemove in the same update.
              // We will perform a transaction for this.
              console.error("Combining add and remove in one go is not directly supported, requires transactions.");
              // For simplicity, we'll do two separate updates. This is not atomic.
              await updateDoc(groupRef, { members: arrayRemove(...memberIdsToRemove) });
              await updateDoc(groupRef, { members: arrayUnion(...membersToAddIds) });
              return;
          }
      }
      
      await updateDoc(groupRef, updatePayload);
  };


  
  const balances = useMemo(() => {
    if (!currentUser) {
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
      totalOwedToUser: finalSettlements.filter(s => s.to.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
      totalOwedByUser: finalSettlements.filter(s => s.from.id === currentUser.id).reduce((sum, s) => sum + s.amount, 0),
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
    login,
    signup,
    logout,
    updateUserProfile,
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
