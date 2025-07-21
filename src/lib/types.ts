export type User = {
  id: string;
  name: string;
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
  members: string[];
};

export type Balance = {
  userId: string;
  amount: number;
}
