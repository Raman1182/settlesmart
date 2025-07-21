
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type Auth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, getDoc, setDoc, arrayUnion, arrayRemove, writeBatch, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase";
import type { User, Group, Expense, Participant, UnequalSplit, ChecklistItem, Message, Friendship } from "@/lib/types";

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
  isAuthLoading: boolean;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  messages: Message[];
  friendships: Friendship[];
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
  sendFriendRequest: (email: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  rejectFriendRequest: (friendshipId: string) => Promise<void>;
  getChatMessages: (friendId: string, callback: (messages: Message[]) => void) => () => void;
  sendMessage: (receiverId: string, text: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  addAdHocUser: (name: string) => Promise<User>;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupChecklists, setGroupChecklists] = useState<{ [groupId: string]: ChecklistItem[] }>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  // Firebase services state
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);


  useEffect(() => {
    // Initialize Firebase
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);
    setAuth(authInstance);
    setDb(dbInstance);

    // Set up auth state listener
    const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
            const userRef = doc(dbInstance, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setCurrentUser({ id: user.uid, ...userSnap.data() } as User);
            } else {
                 const name = user.email!.split('@')[0] || 'New User';
                 const initials = name.charAt(0).toUpperCase();
                 const newUserRecord: User = {
                    id: user.uid,
                    email: user.email!,
                    name: name,
                    avatar: `https://placehold.co/100x100.png?text=${initials}`,
                    initials: initials,
                };
                await setDoc(userRef, { email: newUserRecord.email, name: newUserRecord.name, avatar: newUserRecord.avatar, initials: initials });
                setCurrentUser(newUserRecord);
            }
        } else {
            setCurrentUser(null);
            // Reset all data states on logout
            setUsers([]);
            setGroups([]);
            setExpenses([]);
            setFriendships([]);
            setMessages([]);
            setGroupChecklists({});
        }
        setIsAuthLoading(false);
    });

    return () => {
        unsubscribeAuth();
    };
  }, []);

  // Effect for users, groups, friendships
  useEffect(() => {
    if (!currentUser?.id || !db) {
        setGroups([]);
        setExpenses([]);
        setFriendships([]);
        setGroupChecklists({});
        setUsers([]);
        return;
    };
    
    const currentUserId = currentUser.id;

    // Listener for all users
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(allUsers);
    });

    // Listener for groups the user is a member of
    const qGroups = query(collection(db, "groups"), where("members", "array-contains", currentUserId));
    const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
        const userGroups: Group[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Group));
        setGroups(userGroups);
    });

    // Listener for friendships
    const qFriendships = query(collection(db, "friendships"), where("userIds", "array-contains", currentUserId));
    const unsubscribeFriendships = onSnapshot(qFriendships, (querySnapshot) => {
        const userFriendships: Friendship[] = [];
        querySnapshot.forEach((doc) => {
            userFriendships.push({ id: doc.id, ...doc.data()} as Friendship);
        });
        setFriendships(userFriendships);
    });

    // Return cleanup function for all top-level listeners
    return () => {
        unsubscribeUsers();
        unsubscribeGroups();
        unsubscribeFriendships();
    };
  }, [currentUser?.id, db]);
  
    // Effect for expenses based on groups
    useEffect(() => {
        if (!db || groups.length === 0) {
            setExpenses([]);
            return;
        }
        const groupIds = groups.map(g => g.id);
        if (groupIds.length === 0) {
          setExpenses([]);
          return;
        }
        const qExpenses = query(collection(db, "expenses"), where("groupId", "in", groupIds));
        const unsubscribeExpenses = onSnapshot(qExpenses, (expSnapshot) => {
            const groupExpenses = expSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate().toISOString() } as Expense));
            setExpenses(groupExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });
        return () => unsubscribeExpenses();
    }, [db, groups]);

    // Effect for checklists based on groups
    useEffect(() => {
        if (!db || groups.length === 0) {
            setGroupChecklists({});
            return;
        }
        const groupIds = groups.map(g => g.id);
        if (groupIds.length === 0) {
            setGroupChecklists({});
            return;
        }
        const qChecklists = query(collection(db, "checklists"), where("groupId", "in", groupIds));
        const unsubscribeChecklists = onSnapshot(qChecklists, (checklistSnapshot) => {
            const checklistsData: {[groupId: string]: ChecklistItem[]} = {};
            checklistSnapshot.docs.forEach(doc => {
                checklistsData[doc.id] = doc.data().items;
            });
            setGroupChecklists(checklistsData);
        });
        return () => unsubscribeChecklists();
    }, [db, groups]);
  
  // Memoize chatIds to prevent re-renders unless friendships actually change
  const chatIdsString = useMemo(() => {
    if (!currentUser?.id || friendships.length === 0) return '[]';
    
    const acceptedFriendships = friendships.filter(f => f.status === 'accepted');
    if (acceptedFriendships.length === 0) return '[]';
    
    const chatIds = acceptedFriendships.map(f => [f.userIds[0], f.userIds[1]].sort().join('_'));
    return JSON.stringify(chatIds.sort());
  }, [friendships, currentUser?.id]);


  // Decoupled effect for messages
  useEffect(() => {
      if (!currentUser?.id || !db) {
          setMessages([]);
          return;
      }
      const chatIds = JSON.parse(chatIdsString);
      if (chatIds.length === 0) {
          setMessages([]);
          return;
      }
      
      const qMessages = query(collection(db, "messages"), where("chatId", "in", chatIds), orderBy("createdAt"));
      const unsubscribeMessages = onSnapshot(qMessages, (msgSnapshot) => {
          const receivedMessages: Message[] = msgSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
              } as Message
          });
          setMessages(receivedMessages);
      }, (error) => {
          console.error("Message listener error:", error);
      });
  
      return () => unsubscribeMessages();
  }, [currentUser?.id, db, chatIdsString]);


  const signUp = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth not initialized");
    return createUserWithEmailAndPassword(auth, email, pass);
  }

  const signIn = (email: string, pass: string) => {
    if (!auth) throw new Error("Auth not initialized");
    return signInWithEmailAndPassword(auth, email, pass);
  }
  
  const signOut = () => {
    if (!auth) throw new Error("Auth not initialized");
    return firebaseSignOut(auth);
  }

  const sendFriendRequest = async (email: string) => {
    if (!currentUser || !db) throw new Error("Not authenticated or DB not initialized");
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const toUserSnapshot = await getDocs(q);

    if (toUserSnapshot.empty) {
      throw new Error('User with that email does not exist.');
    }
    const toUser = { id: toUserSnapshot.docs[0].id, ...toUserSnapshot.docs[0].data() };

    if (toUser.id === currentUser.id) {
      throw new Error("You can't send a request to yourself.");
    }

    const friendshipsRef = collection(db, 'friendships');
    const userIds = [currentUser.id, toUser.id].sort();
    const existingQuery = query(friendshipsRef, where('userIds', '==', userIds));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error("You are already friends or a request is pending.");
    }

    await addDoc(friendshipsRef, {
      userIds: userIds,
      status: 'pending',
      requestedBy: currentUser.id,
      createdAt: serverTimestamp(),
    });
  }

  const acceptFriendRequest = async (friendshipId: string) => {
     if (!db) return;
     const friendshipRef = doc(db, 'friendships', friendshipId);
     await updateDoc(friendshipRef, { status: 'accepted' });
  }

  const rejectFriendRequest = async (friendshipId: string) => {
     if (!db) return;
     const friendshipRef = doc(db, 'friendships', friendshipId);
     await deleteDoc(friendshipRef);
  }
  
   const getChatMessages = (friendId: string, callback: (messages: Message[]) => void) => {
    // Sanity check inputs to prevent invalid queries
    if (!currentUser?.id || !friendId || !db) {
        console.error("getChatMessages failed: currentUser, friendId, or db is not available.", {
            hasCurrentUser: !!currentUser?.id,
            hasFriendId: !!friendId,
            hasDb: !!db,
        });
        return () => {}; // Return a no-op cleanup function
    }

    const chatId = [currentUser.id, friendId].sort().join('_');
    
    const q = query(
        collection(db, "messages"), 
        where("chatId", "==", chatId),
        orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        } as Message));
        callback(chatMessages);
    }, (error) => {
        console.error(`Firestore listener error for chatID ${chatId}:`, error);
    });
    
    return unsubscribe; // Return the actual unsubscribe function from onSnapshot
  };

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser || !db) throw new Error("Not authenticated or DB not initialized");
    const chatId = [currentUser.id, receiverId].sort().join('_');
    
    await addDoc(collection(db, "messages"), {
      chatId: chatId, 
      senderId: currentUser.id,
      text,
      read: false,
      createdAt: serverTimestamp()
    });
  }
  
  const markMessageAsRead = async (messageId: string) => {
    if (!db) return;
    const messageRef = doc(db, "messages", messageId);
    await updateDoc(messageRef, { read: true });
  }

  const findUserById = useCallback((id: string) => {
      return users.find(u => u.id === id);
  }, [users]);
  
  const addAdHocUser = async (name: string): Promise<User> => {
    if (!db) throw new Error("DB not initialized");
    const adHocUser: Omit<User, 'id'> = {
        name: name,
        email: `${name.replace(/\s+/g, '_').toLowerCase()}@adhoc.settlesmart.app`,
        initials: name.charAt(0).toUpperCase(),
        avatar: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`
    };
    const docRef = await addDoc(collection(db, "users"), adHocUser);
    const newUser = { id: docRef.id, ...adHocUser };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const addExpense = async (expenseData: AddExpenseData) => {
     if (!currentUser || !db) throw new Error("No user found or DB not initialized");
    
     await addDoc(collection(db, "expenses"), {
      ...expenseData,
      date: new Date(),
      isRecurring: expenseData.isRecurring || false,
    });
  };

  const createGroup = async (name: string, memberEmails: string[]) => {
      if (!currentUser || !db) throw new Error("Not authenticated or DB not initialized");
      
      const memberIds = new Set<string>([currentUser.id]);
      
      if(memberEmails.length > 0) {
          const userQueries = memberEmails.map(email => query(collection(db, "users"), where("email", "==", email)));
          const userSnapshots = await Promise.all(userQueries.map(q => getDocs(q)));

          userSnapshots.forEach(snap => {
            if (!snap.empty) {
                memberIds.add(snap.docs[0].id);
            }
          });
      }
      
      await addDoc(collection(db, "groups"), {
        name,
        members: Array.from(memberIds),
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
      });
  };

  const updateGroupMembers = async (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => {
      if (!db) return;
      const groupRef = doc(db, "groups", groupId);
      const membersToAddIds: string[] = [];
      if (memberEmailsToAdd.length > 0) {
        const userQuery = query(collection(db, "users"), where("email", "in", memberEmailsToAdd));
        const userSnapshots = await getDocs(userQuery);
        userSnapshots.forEach(doc => membersToAddIds.push(doc.id));
      }

      await updateDoc(groupRef, {
        members: arrayUnion(...membersToAddIds),
      });
      if(memberIdsToRemove.length > 0) {
         await updateDoc(groupRef, {
            members: arrayRemove(...memberIdsToRemove),
         });
      }
  };
  
  const deleteGroup = async (groupId: string) => {
    if (!db) return;
    const batch = writeBatch(db);
    // Delete group document
    batch.delete(doc(db, "groups", groupId));
    // Delete associated expenses
    const expQuery = query(collection(db, "expenses"), where("groupId", "==", groupId));
    const expSnap = await getDocs(expQuery);
    expSnap.forEach(doc => batch.delete(doc.ref));
    // Delete associated checklist
    batch.delete(doc(db, "checklists", groupId));
    await batch.commit();
  };
  
  const leaveGroup = async (groupId: string) => {
     if (!currentUser || !db) throw new Error("Not authenticated or DB not initialized");
     const groupRef = doc(db, "groups", groupId);
     await updateDoc(groupRef, {
        members: arrayRemove(currentUser.id)
     });
  };
  
  const updateGroupChecklist = async (groupId: string, items: ChecklistItem[]) => {
    if (!db) return;
    const checklistRef = doc(db, "checklists", groupId);
    await setDoc(checklistRef, { groupId, items }, { merge: true });
  };
  
  const settleFriendDebt = async (friendId: string) => {
    if (!currentUser || !db) throw new Error("Not authenticated or DB not initialized");
    const q = query(collection(db, "expenses"), where('splitWith', 'array-contains', currentUser.id));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => {
        const expense = doc.data() as Expense;
        const participants = new Set(expense.splitWith);
        if (participants.size === 2 && participants.has(friendId)) {
            batch.delete(doc.ref);
        }
    });
    await batch.commit();
  }
  
  const settleAllInGroup = async (groupId: string) => {
    if (!db) return;
    const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  };

  const calculateSettlements = useCallback((expensesToCalculate: Expense[], allParticipantIds: string[]) => {
    const userBalances: { [key: string]: number } = {};
    allParticipantIds.forEach(pId => userBalances[pId] = 0);

    expensesToCalculate.forEach(expense => {
        const participantsInThisExpense = expense.splitWith.filter(p => allParticipantIds.includes(p));
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
  
    const getAllParticipantsInExpenses = useMemo(() => {
    const all = new Set<string>();
    expenses.forEach(e => {
        e.splitWith.forEach(p => all.add(p));
        all.add(e.paidById);
    });
    return Array.from(all);
  }, [expenses]);

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
    const allInvolvedUserIds = [...new Set([...users.map(u => u.id), ...getAllParticipantsInExpenses])];
    const userBalances = calculateSettlements(expenses, allInvolvedUserIds);

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
  }, [expenses, currentUser, findUserById, calculateSettlements, getAllParticipantsInExpenses, simplifyDebts, users]);


  const value = {
    currentUser,
    isAuthLoading,
    users,
    groups,
    expenses,
    messages,
    friendships,
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
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getChatMessages,
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
