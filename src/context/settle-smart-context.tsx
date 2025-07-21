

"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type Auth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, getDoc, setDoc, arrayUnion, arrayRemove, writeBatch, type Firestore, enableIndexedDbPersistence, limit, increment } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase";
import type { User, Group, Expense, Participant, UnequalSplit, ChecklistItem, Friendship, Message, Chat } from "@/lib/types";
import { differenceInDays } from "date-fns";

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
  friendships: Friendship[];
  chats: Chat[];
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
  calculateSettlements: (expensesToCalculate: Expense[], allParticipantIds: string[]) => { [key: string]: number; };
  simplifyDebts: (userBalances: { [key: string]: number; }) => { from: string; to: string; amount: number; }[];
  simplifyGroupDebts: (groupId: string) => { from: User, to: User, amount: number }[];
  settleAllInGroup: (groupId: string) => void;
  sendFriendRequest: (receiverId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  declineFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  getChatMessages: (friendId: string, callback: (messages: Message[]) => void) => () => void;
  sendMessage: (friendId: string, text: string, type?: 'user' | 'system') => Promise<void>;
  markMessagesAsRead: (chatId: string) => Promise<void>;
  calculateUserTrustScore: (userId: string) => number;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  addAdHocUser: (name: string) => Promise<User>;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [rawChats, setRawChats] = useState<Omit<Chat, 'participants'>[]>([]);
  const [groupChecklists, setGroupChecklists] = useState<{ [groupId: string]: ChecklistItem[] }>({});

  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  
  const findUserById = useCallback((id: string): User | undefined => {
      return users.find(u => u.id === id);
  }, [users]);
  
  useEffect(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);

    enableIndexedDbPersistence(dbInstance)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Firestore persistence failed: multiple tabs open.");
        } else if (err.code == 'unimplemented') {
            console.warn("Firestore persistence not available in this browser.");
        }
    });

    setAuth(authInstance);
    setDb(dbInstance);

    const unsubscribeAuth = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
            const userRef = doc(dbInstance, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = { id: user.uid, ...userSnap.data() } as User;
                setCurrentUser(userData);
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
        }
        setIsAuthLoading(false);
    });

    return () => {
        unsubscribeAuth();
    };
  }, []);

  // Listener for all users
  useEffect(() => {
    if (!db) return;
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(allUsers);
    });
    return () => unsubUsers();
  }, [db]);

  // Listeners that depend on the current user
  useEffect(() => {
    if (isAuthLoading || !db || !currentUser) {
        setGroups([]);
        setExpenses([]);
        setFriendships([]);
        setRawChats([]);
        setGroupChecklists({});
        return;
    }
    
    const qExpenses = query(collection(db, "expenses"), where("splitWith", "array-contains", currentUser.id));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
        const userExpenses = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date.toDate().toISOString(),
                settledAt: data.settledAt ? data.settledAt.toDate().toISOString() : null,
            } as Expense
        });
        setExpenses(userExpenses);
    });

    const qGroups = query(collection(db, "groups"), where("members", "array-contains", currentUser.id));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
        const userGroups: Group[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Group));
        setGroups(userGroups);
        
        if (userGroups.length > 0) {
            const groupIds = userGroups.map(g => g.id);
            const qChecklists = query(collection(db, "checklists"), where("groupId", "in", groupIds));
            onSnapshot(qChecklists, (checklistSnapshot) => {
                const checklistsData: {[groupId: string]: ChecklistItem[]} = {};
                checklistSnapshot.docs.forEach(doc => {
                    checklistsData[doc.id] = doc.data().items;
                });
                setGroupChecklists(checklistsData);
            });
        }
    });
    
    const qFriendships = query(collection(db, "friendships"), where("participantIds", "array-contains", currentUser.id));
    const unsubFriendships = onSnapshot(qFriendships, (snapshot) => {
        const userFriendships = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Friendship));
        setFriendships(userFriendships);
    });
    
    const qChats = query(collection(db, 'chats'), where('participantIds', 'array-contains', currentUser.id));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const allChats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastMessage: data.lastMessage ? {
              ...data.lastMessage,
              timestamp: data.lastMessage.timestamp?.toDate().toISOString()
          } : null,
        } as Omit<Chat, 'participants'>;
      });
      setRawChats(allChats);
    });

    return () => {
        unsubExpenses();
        unsubGroups();
        unsubFriendships();
        unsubChats();
    };
  }, [currentUser, isAuthLoading, db]);
  

   const chats = useMemo(() => {
    if (!currentUser) return [];
    return rawChats.map(chat => {
      const friendId = chat.participantIds.find((id: string) => id !== currentUser.id);
      const friend = findUserById(friendId || '');
      return {
        ...chat,
        participants: [currentUser, friend].filter(Boolean) as User[]
      }
    })
  }, [rawChats, currentUser, findUserById]);

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
  
  const addAdHocUser = async (name: string): Promise<User> => {
    if (!db) throw new Error("DB not initialized");
    const normalizedName = name.trim();
    const adHocEmail = `${normalizedName.replace(/\s+/g, '_').toLowerCase()}@adhoc.settlesmart.app`;
    
    const q = query(collection(db, "users"), where("email", "==", adHocEmail));
    const existing = await getDocs(q);

    if (!existing.empty) {
        const doc = existing.docs[0];
        return { id: doc.id, ...doc.data() } as User;
    }

    const initials = normalizedName.charAt(0).toUpperCase();
    const adHocUser: Omit<User, 'id'> = {
        name: normalizedName,
        email: adHocEmail,
        initials: initials,
        avatar: `https://placehold.co/100x100.png?text=${initials}`
    };
    const docRef = await addDoc(collection(db, "users"), adHocUser);
    const newUser = { id: docRef.id, ...adHocUser };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const addExpense = async (expenseData: AddExpenseData) => {
     if (!currentUser || !db) throw new Error("No user found or DB not initialized");
    
     const { isRecurring, ...restOfData } = expenseData;

     await addDoc(collection(db, "expenses"), {
      ...restOfData,
      recurring: isRecurring ? 'monthly' : null,
      date: new Date(),
      status: 'unsettled',
      settledAt: null,
    });

     for (const pId of expenseData.splitWith) {
        const user = findUserById(pId);
        if (user && user.email.endsWith('@adhoc.settlesmart.app') && pId !== currentUser.id) {
           const friendshipQuery = query(
              collection(db, "friendships"),
              where("participantIds", "in", [[currentUser.id, pId], [pId, currentUser.id]])
            );
            const existingFriendship = await getDocs(friendshipQuery);
            if (existingFriendship.empty) {
                 await addDoc(collection(db, "friendships"), {
                    requesterId: currentUser.id,
                    receiverId: pId,
                    status: 'accepted',
                    participantIds: [currentUser.id, pId],
                    createdAt: serverTimestamp()
                });
            }
        }
     }
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
    batch.delete(doc(db, "groups", groupId));
    const expQuery = query(collection(db, "expenses"), where("groupId", "==", groupId));
    const expSnap = await getDocs(expQuery);
    expSnap.forEach(doc => batch.delete(doc.ref));
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
    const batch = writeBatch(db);
    
    const expensesToSettle = expenses.filter(e => 
        e.groupId === null &&
        e.status === 'unsettled' &&
        e.splitWith.length === 2 &&
        e.splitWith.includes(currentUser.id) &&
        e.splitWith.includes(friendId)
    );

    expensesToSettle.forEach(expense => {
        const expenseRef = doc(db, "expenses", expense.id);
        batch.update(expenseRef, {
            status: 'settled',
            settledAt: serverTimestamp()
        });
    });

    await batch.commit();

    const friend = findUserById(friendId);
    if(friend && !friend.email.endsWith('@adhoc.settlesmart.app')) {
      await sendMessage(friendId, `${currentUser.name} has marked all debts between you as settled.`, 'system');
    }
  }
  
  const settleAllInGroup = async (groupId: string) => {
    if (!db) return;
    const q = query(collection(db, "expenses"), where("groupId", "==", groupId), where("status", "==", "unsettled"));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(expenseDoc => {
        batch.update(expenseDoc.ref, {
            status: 'settled',
            settledAt: serverTimestamp()
        });
    });
    await batch.commit();
  };
  
  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUser || !db) throw new Error("Not authenticated");
    const friendshipQuery = query(
      collection(db, "friendships"),
      where("participantIds", "in", [[currentUser.id, receiverId], [receiverId, currentUser.id]])
    );
    const existingFriendship = await getDocs(friendshipQuery);
    if (!existingFriendship.empty) {
      throw new Error("Friendship request already exists.");
    }
    
    await addDoc(collection(db, "friendships"), {
      requesterId: currentUser.id,
      receiverId: receiverId,
      status: 'pending',
      participantIds: [currentUser.id, receiverId],
      createdAt: serverTimestamp()
    });
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    if (!currentUser || !db) return;
    const friendshipRef = doc(db, "friendships", friendshipId);
    const friendshipSnap = await getDoc(friendshipRef);
    if (!friendshipSnap.exists()) return;

    const friendshipData = friendshipSnap.data();
    const friendId = friendshipData.requesterId === currentUser.id ? friendshipData.receiverId : friendshipData.requesterId;
    
    const batch = writeBatch(db);
    batch.update(friendshipRef, { status: 'accepted' });

    const chatId = getChatId(currentUser.id, friendId);
    const chatRef = doc(db, "chats", chatId);
    batch.set(chatRef, {
      participantIds: [currentUser.id, friendId],
      lastMessage: null,
      unreadCount: { [currentUser.id]: 0, [friendId]: 0 },
    }, { merge: true });

    await batch.commit();
  };
  
  const declineFriendRequest = async (friendshipId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "friendships", friendshipId));
  };
  
  const removeFriend = async (friendId: string) => {
    if (!currentUser || !db) return;
    const friendshipQuery = query(
      collection(db, "friendships"),
      where("participantIds", "in", [[currentUser.id, friendId], [friendId, currentUser.id]]),
      where("status", "==", "accepted"),
      limit(1)
    );
    const friendshipSnapshot = await getDocs(friendshipQuery);
    if (!friendshipSnapshot.empty) {
      await deleteDoc(friendshipSnapshot.docs[0].ref);
    } else {
        throw new Error("Friendship not found.");
    }
  };
  
  const getChatId = (user1: string, user2: string) => {
    return [user1, user2].sort().join('_');
  };

  const getChatMessages = (friendId: string, callback: (messages: Message[]) => void) => {
    if (!currentUser || !db) return () => {};
    const friend = findUserById(friendId);
     if (!friend || friend.email.endsWith('@adhoc.settlesmart.app')) return () => {};

    const chatId = getChatId(currentUser.id, friendId);
    const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy("timestamp", "asc"));
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString()
      } as Message));
      callback(messages);
    });
  };

  const sendMessage = async (friendId: string, text: string, type: 'user' | 'system' = 'user') => {
    if (!currentUser || !db) throw new Error("Not authenticated");
    const friend = findUserById(friendId);
    if (!friend || friend.email.endsWith('@adhoc.settlesmart.app')) {
      throw new Error("Cannot send messages to non-registered users.");
    }
    
    const chatId = getChatId(currentUser.id, friendId);
    const chatRef = doc(db, "chats", chatId);
    const messagesColRef = collection(chatRef, 'messages');

    const newMessage: Omit<Message, 'id' | 'timestamp'> = {
        chatId,
        senderId: currentUser.id,
        text,
        type,
        read: false,
    };
    
    const batch = writeBatch(db);
    
    const newMessageRef = doc(messagesColRef);
    batch.set(newMessageRef, { ...newMessage, timestamp: serverTimestamp() });
    
    const unreadCountKey = `unreadCount.${friendId}`;
    
    const chatUpdatePayload = {
        lastMessage: {
            ...newMessage,
            text: type === 'system' ? text : text,
            senderId: currentUser.id,
            timestamp: serverTimestamp(),
        },
        [unreadCountKey]: increment(1)
    };

    batch.set(chatRef, chatUpdatePayload, { merge: true });

    await batch.commit();
  };

  const markMessagesAsRead = async (chatId: string) => {
      if (!currentUser || !db) return;
      const chatRef = doc(db, "chats", chatId);
      const unreadCountKey = `unreadCount.${currentUser.id}`;
      await setDoc(chatRef, { [unreadCountKey]: 0 }, { merge: true });
  }

  const calculateSettlements = useCallback((expensesToCalculate: Expense[], allParticipantIds: string[]) => {
    const unsettledExpenses = expensesToCalculate.filter(e => e.status === 'unsettled');
    const userBalances: { [key: string]: number } = {};
    allParticipantIds.forEach(pId => userBalances[pId] = 0);

    unsettledExpenses.forEach(expense => {
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
      
      const settledExpenses = groupExpenses.filter(e => e.status === 'settled');
      const settledAmount = settledExpenses.reduce((sum, e) => sum + e.amount, 0);

      const memberBalances = calculateSettlements(groupExpenses, group.members);
      
      const totalPositive = Object.values(memberBalances).filter(v => v > 0).reduce((s, v) => s + v, 0);
      const remaining = totalPositive;
      const progress = total > 0 ? (settledAmount / total) * 100 : 100;

      return { total, settled: settledAmount, remaining, progress, memberBalances };

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

    const totalOwedToUser = finalSettlements.filter(s => s.to?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0);
    const totalOwedByUser = finalSettlements.filter(s => s.from?.id === currentUser?.id).reduce((sum, s) => sum + s.amount, 0);

    return {
      totalOwedToUser,
      totalOwedByUser,
      settlements: finalSettlements
    };
  }, [expenses, currentUser, users, getAllParticipantsInExpenses, calculateSettlements, simplifyDebts, findUserById]);

  const calculateUserTrustScore = useCallback((userId: string) => {
      let score = 70;

      const userExpenses = expenses.filter(e => e.splitWith.includes(userId));
      if (userExpenses.length < 3) return 70;

      // 1. Analyze repayment speed for debts owed by the user
      const debtsOwedByUser = userExpenses.filter(e => e.paidById !== userId && e.splitWith.includes(userId));
      const settledDebts = debtsOwedByUser.filter(e => e.status === 'settled' && e.settledAt);
      
      if (settledDebts.length > 0) {
        const totalRepayTime = settledDebts.reduce((sum, e) => {
            return sum + differenceInDays(new Date(e.settledAt!), new Date(e.date));
        }, 0);
        const avgRepayDays = totalRepayTime / settledDebts.length;
        
        if (avgRepayDays <= 2) score += 15;
        else if (avgRepayDays <= 7) score += 5;
        else if (avgRepayDays > 30) score -= 20;
        else if (avgRepayDays > 14) score -= 10;
      }

      // 2. Analyze lending history
      const userLentExpenses = expenses.filter(e => e.paidById === userId);
      const totalLentAmount = userLentExpenses.reduce((sum, e) => sum + e.amount, 0);
      score += Math.min(15, totalLentAmount / 1000); // Bonus for total amount lent, capped at +15

      // 3. Analyze current outstanding debt
      const allInvolvedUserIds = [...new Set([...users.map(u => u.id), ...getAllParticipantsInExpenses])];
      const allBalances = calculateSettlements(expenses, allInvolvedUserIds);
      const userBalance = allBalances[userId] || 0;
      
      if (userBalance < 0) { // User owes money
          score -= Math.min(30, Math.abs(userBalance) / 50); // Penalty for outstanding debt, capped at -30
      }

      return Math.max(0, Math.min(100, Math.round(score)));
  }, [expenses, users, getAllParticipantsInExpenses, calculateSettlements]);


  const value = {
    currentUser,
    isAuthLoading,
    users,
    groups,
    expenses,
    friendships,
    chats,
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
    calculateSettlements,
    simplifyDebts,
    simplifyGroupDebts,
    settleAllInGroup,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    getChatMessages,
    sendMessage,
    markMessagesAsRead,
    calculateUserTrustScore,
    signUp,
    signIn,
    signOut,
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
