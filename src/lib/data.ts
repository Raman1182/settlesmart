import type { User, Group, Expense } from './types';

export const users: User[] = [
  { id: 'user1', name: 'You', avatar: 'https://placehold.co/100x100.png', initials: 'U' },
  { id: 'user2', name: 'Alice', avatar: 'https://placehold.co/100x100.png', initials: 'A' },
  { id: 'user3', name: 'Bob', avatar: 'https://placehold.co/100x100.png', initials: 'B' },
  { id: 'user4', name: 'Charlie', avatar: 'https://placehold.co/100x100.png', initials: 'C' },
];

export const groups: Group[] = [
  {
    id: 'group1',
    name: 'Apartment',
    members: ['user1', 'user2', 'user3'],
  },
  {
    id: 'group2',
    name: 'Road Trip',
    members: ['user1', 'user2', 'user4'],
  },
];

export const expenses: Expense[] = [
  {
    id: 'exp1',
    description: 'Monthly Rent',
    amount: 1200,
    category: 'Rent',
    paidById: 'user1',
    splitWith: ['user1', 'user2', 'user3'],
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    groupId: 'group1',
  },
  {
    id: 'exp2',
    description: 'Groceries',
    amount: 150,
    category: 'Groceries',
    paidById: 'user2',
    splitWith: ['user1', 'user2', 'user3'],
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    groupId: 'group1',
  },
  {
    id: 'exp3',
    description: 'Internet Bill',
    amount: 60,
    category: 'Utilities',
    paidById: 'user3',
    splitWith: ['user1', 'user2', 'user3'],
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    groupId: 'group1',
  },
  {
    id: 'exp4',
    description: 'Gas',
    amount: 50,
    category: 'Travel',
    paidById: 'user1',
    splitWith: ['user1', 'user2', 'user4'],
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    groupId: 'group2',
  },
  {
    id: 'exp5',
    description: 'Hotel Booking',
    amount: 300,
    category: 'Travel',
    paidById: 'user4',
    splitWith: ['user1', 'user2', 'user4'],
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    groupId: 'group2',
  },
];
