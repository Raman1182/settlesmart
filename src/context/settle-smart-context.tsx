
"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { sendFriendRequest as sendFriendRequestFlow, respondToFriendRequest } from "@/ai/flows/friend-request-flow";

import type { User, Group, Expense, Participant, UnequalSplit, ChecklistItem, Message, Friendship } from "@/lib/types";
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
  addAdHocUser: (email: string) => void;
}

const SettleSmartContext = createContext<SettleSmartContextType | undefined>(undefined);

// A simple in-memory store to persist data across "logins" in the mock environment
const appDataStore = {
  users: [...mockUsers],
  groups: [...mockGroups],
  expenses: [...mockExpenses],
  groupChecklists: {} as { [groupId: string]: ChecklistItem[] },
  friendships: [] as Friendship[],
  messages: [] as Message[]
};


export const SettleSmartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<User[]>(appDataStore.users);
  const [groups, setGroups] = useState<Group[]>(appDataStore.groups);
  const [expenses, setExpenses] = useState<Expense[]>(appDataStore.expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const [groupChecklists, setGroupChecklists] = useState<{ [groupId: string]: ChecklistItem[] }>(appDataStore.groupChecklists);
  const [messages, setMessages] = useState<Message[]>(appDataStore.messages);
  const [friendships, setFriendships] = useState<Friendship[]>(appDataStore.friendships);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const existingUser = appDataStore.users.find(u => u.id === user.uid || u.email === user.email);
            if (existingUser) {
                setCurrentUser(existingUser);
            } else {
                const newUserRecord: User = {
                    id: user.uid,
                    email: user.email!,
                    name: user.email!.split('@')[0],
                    avatar: `https://placehold.co/100x100?text=${user.email!.charAt(0).toUpperCase()}`,
                    initials: user.email!.charAt(0).toUpperCase(),
                };
                appDataStore.users.push(newUserRecord);
                setUsers(prev => [...prev, newUserRecord!]);
                await setDoc(doc(db, "users", user.uid), { email: user.email, name: newUserRecord.name, avatar: newUserRecord.avatar, initials: newUserRecord.initials });
                setCurrentUser(newUserRecord);
            }
        } else {
            setCurrentUser(null);
        }
        setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
        setMessages([]);
        setFriendships([]);
        return;
    };
    
    const currentUserId = currentUser.id;

    // Listener for friendships
    const qFriendships = query(collection(db, "friendships"), where("userIds", "array-contains", currentUserId));
    const unsubscribeFriendships = onSnapshot(qFriendships, (querySnapshot) => {
        const userFriendships: Friendship[] = [];
        querySnapshot.forEach((doc) => {
            userFriendships.push({ id: doc.id, ...doc.data()} as Friendship);
        });
        setFriendships(userFriendships);
        appDataStore.friendships = userFriendships;
    }, (error) => {
        console.error("Error fetching friendships:", error);
    });

    // Listener for messages
    const qMessages = query(collection(db, "messages"), where("chatId", "array-contains", currentUserId));
    const unsubscribeMessages = onSnapshot(qMessages, (msgSnapshot) => {
          const receivedMessages: Message[] = msgSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                chatId: data.chatId.join('_'), // Rejoin for consistency in the app
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
            } as Message
          });
          const sortedMessages = receivedMessages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setMessages(sortedMessages);
          appDataStore.messages = sortedMessages;

    }, (error) => {
        console.error("Error fetching messages:", error);
    });
    
    return () => {
        unsubscribeFriendships();
        unsubscribeMessages();
    };
  }, [currentUser?.id]);


  const signUp = async (email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const newUserRecord = {
        id: result.user.uid,
        email: email,
        name: email.split('@')[0],
        avatar: `https://placehold.co/100x100?text=${email.charAt(0).toUpperCase()}`,
        initials: email.charAt(0).toUpperCase(),
    };
    appDataStore.users.push(newUserRecord);
    setUsers([...appDataStore.users]);
    await setDoc(doc(db, "users", result.user.uid), { email: newUserRecord.email, name: newUserRecord.name, avatar: newUserRecord.avatar, initials: newUserRecord.initials });
    return result;
  }

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  }
  
  const signOut = () => {
    return firebaseSignOut(auth);
  }

  const sendFriendRequest = async (email: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    const toUser = users.find(u => u.email === email);
    if (!toUser) throw new Error("User with that email does not exist.");
    if (toUser.id === currentUser.id) throw new Error("You can't send a request to yourself.");

    const existing = friendships.find(f => f.userIds.includes(toUser.id) && f.userIds.includes(currentUser.id));
    if (existing) throw new Error("You are already friends or a request is pending.");
    
    // The flow now just returns a status, the context handles the state.
    await sendFriendRequestFlow({ fromUserId: currentUser.id, toUserEmail: email });
    
    const newFriendship: Friendship = {
        id: `fr-${Date.now()}`,
        userIds: [currentUser.id, toUser.id],
        status: 'pending',
        requestedBy: currentUser.id,
    };

    appDataStore.friendships.push(newFriendship);
    setFriendships([...appDataStore.friendships]);
    
    // Simulate Firestore by adding it there as well
    const friendshipsRef = collection(db, 'friendships');
    await addDoc(friendshipsRef, {
        userIds: [currentUser.id, toUser.id],
        status: 'pending',
        requestedBy: currentUser.id,
        createdAt: serverTimestamp(),
    });
  }

  const acceptFriendRequest = async (friendshipId: string) => {
    await respondToFriendRequest({ friendshipId, response: 'accepted' });
  }

  const rejectFriendRequest = async (friendshipId: string) => {
    await respondToFriendRequest({ friendshipId, response: 'rejected' });
  }
  
   const getChatMessages = (friendId: string, callback: (messages: Message[]) => void) => {
    if (!currentUser) return () => {};

    const chatId = [currentUser.id, friendId].sort().join('_');
    const relevantMessages = messages.filter(m => m.chatId === chatId);
    callback(relevantMessages);
    
    const unsubscribe = onSnapshot(query(collection(db, "messages")), () => {
        // This is a bit of a hack to re-run the filter when any message changes.
        // A more optimized approach would listen to a specific chat query.
        const allCurrentMessages = appDataStore.messages;
        const updatedMessages = allCurrentMessages.filter(m => m.chatId === chatId);
        callback(updatedMessages)
    });
    
    return unsubscribe;
  };

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    const chatId = [currentUser.id, receiverId].sort();
    
    const chatRef = doc(db, 'chats', chatId.join('_'));
    const chatDoc = await getDoc(chatRef);

    if(!chatDoc.exists()) {
       await setDoc(chatRef, {
         id: chatId.join('_'),
         members: chatId,
       });
    }

    await addDoc(collection(db, "messages"), {
      chatId: chatId, 
      senderId: currentUser.id,
      text,
      read: false,
      createdAt: serverTimestamp()
    });
  }
  
  const markMessageAsRead = async (messageId: string) => {
    const messageRef = doc(db, "messages", messageId);
    await updateDoc(messageRef, { read: true });
  }

  const findUserById = useCallback((id: string) => {
      let user = users.find(u => u.id === id);
      if (!user) {
          // Fallback for ad-hoc users who might not be in the main list yet
          return {
              id,
              name: 'Unknown User',
              email: '',
              avatar: 'https://placehold.co/100x100.png',
              initials: '?'
          }
      }
      return user;
  }, [users]);


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
    if (users.some(u => u.email === email)) {
        throw new Error("User with this email already exists.");
    }
    const newUser: User = {
        id: `user-${new Date().getTime()}-${Math.random()}`,
        name: email.split('@')[0],
        email: email,
        avatar: `https://placehold.co/100x100?text=${email.charAt(0).toUpperCase()}`,
        initials: email.charAt(0).toUpperCase(),
    };
    setUsers(prev => [...prev, newUser]);
  }

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
      appDataStore.groups.push(newGroup);
  };

  const updateGroupMembers = async (groupId: string, memberEmailsToAdd: string[], memberIdsToRemove: string[]) => {
      const membersToAddIds = users.filter(u => memberEmailsToAdd.includes(u.email)).map(u => u.id);
      
      const groupIndex = groups.findIndex(g => g.id === groupId);
      if (groupIndex > -1) {
          const newMembers = new Set(groups[groupIndex].members);
          membersToAddIds.forEach(id => newMembers.add(id));
          memberIdsToRemove.forEach(id => newMembers.delete(id));
          const updatedGroups = [...groups];
          updatedGroups[groupIndex].members = Array.from(newMembers);
          setGroups(updatedGroups);
      }
  };
  
  const deleteGroup = async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setExpenses(prev => prev.filter(e => e.groupId !== groupId));
  };
  
  const leaveGroup = async (groupId: string) => {
     if (!currentUser) throw new Error("Not authenticated");
     const groupIndex = groups.findIndex(g => g.id === groupId);
      if (groupIndex > -1) {
          const updatedGroups = [...groups];
          updatedGroups[groupIndex].members = updatedGroups[groupIndex].members.filter(mId => mId !== currentUser.id);
          setGroups(updatedGroups);
      }
  };
  
  const updateGroupChecklist = (groupId: string, items: ChecklistItem[]) => {
    setGroupChecklists(prev => ({ ...prev, [groupId]: items}));
  };
  
  const settleFriendDebt = async (friendId: string) => {
    if (!currentUser) throw new Error("Not authenticated");
    setExpenses(prev => prev.filter(e => {
        const participants = new Set(e.splitWith);
        return !(participants.size === 2 && participants.has(currentUser.id) && participants.has(friendId));
    }));
  }
  
  const settleAllInGroup = (groupId: string) => {
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
