

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
  date: string;
  groupId: string | null; // Can be null for expenses not in a group
  isRecurring: boolean;
};

export type Group = {
  id:string;
  name: string;
  members: string[]; // array of user IDs
  createdAt?: any; // serverTimestamp
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
