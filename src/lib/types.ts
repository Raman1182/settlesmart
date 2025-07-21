export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  avatar: string;
  initials: string;
};

// A participant can be a registered user (by ID) or an ad-hoc name (string)
export type Participant = string; 

export type UnequalSplit = {
  participantId: string;
  amount: number;
}

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidById: string; // Must be a registered user ID
  splitWith: Participant[]; // Array of user IDs or ad-hoc names
  splitType: 'equally' | 'unequally';
  unequalSplits?: UnequalSplit[];
  date: string; // ISO string for creation date
  groupId: string | null; // Can be null for expenses not in a group
  status: 'unsettled' | 'settled';
  settledAt?: string | null; // ISO string for settlement date
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
};

export type Group = {
  id:string;
  name: string;
  members: string[]; // array of user IDs
  createdAt?: string; // ISO string
  createdBy?: string;
};

export type Balance = {
  userId: string;
  amount: number;
}

export interface ChecklistItem {
  id: string;
  name: string;
  completed: boolean;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  participantIds: string[];
  createdAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  type?: 'system' | 'user';
}

export interface Chat {
    id: string;
    participantIds: string[];
    participants: User[];
    lastMessage: Message | null;
    unreadCount: { [userId: string]: number };
}

    