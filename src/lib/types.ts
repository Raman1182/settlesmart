

export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  avatar: string;
  initials: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidById: string;
  splitWith: string[];
  date: string;
  groupId: string;
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
