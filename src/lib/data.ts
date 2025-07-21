
import type { User, Group, Expense } from './types';

export const users: User[] = [
  { id: 'user1', name: 'You', email: 'you@example.com', avatar: 'https://placehold.co/100x100/64748b/ffffff.png', initials: 'U' },
  { id: 'user2', name: 'Alex', email: 'alex@example.com', avatar: 'https://placehold.co/100x100/ec4899/ffffff.png', initials: 'A' },
  { id: 'user3', name: 'Ben', email: 'ben@example.com', avatar: 'https://placehold.co/100x100/8b5cf6/ffffff.png', initials: 'B' },
  { id: 'user4', name: 'Chloe', email: 'chloe@example.com', avatar: 'https://placehold.co/100x100/14b8a6/ffffff.png', initials: 'C' },
  { id: 'user5', name: 'David', email: 'david@example.com', avatar: 'https://placehold.co/100x100/f59e0b/ffffff.png', initials: 'D' },
  { id: 'user6', name: 'Rachel', email: 'rachel@example.com', avatar: 'https://placehold.co/100x100/ef4444/ffffff.png', initials: 'R' },
];

export const groups: Group[] = [
    { 
        id: 'group1', 
        name: 'Goa Trip', 
        members: ['user1', 'user2', 'user3'],
        createdBy: 'user1',
        createdAt: '2023-10-01T10:00:00Z',
    },
    { 
        id: 'group2', 
        name: 'Apartment Flatmates', 
        members: ['user1', 'user4', 'user5', 'user6'],
        createdBy: 'user4',
        createdAt: '2023-09-15T10:00:00Z',
    },
];

export const expenses: Expense[] = [
    {
        id: 'exp1',
        description: 'Lunch at Beach Shack',
        amount: 3000,
        category: 'Food & Drink',
        paidById: 'user2',
        splitWith: ['user1', 'user2', 'user3'],
        date: '2023-10-25T14:30:00Z',
        groupId: 'group1',
    },
    {
        id: 'exp2',
        description: 'October Rent',
        amount: 60000,
        category: 'Rent',
        paidById: 'user1',
        splitWith: ['user1', 'user4', 'user5'],
        date: '2023-10-05T11:00:00Z',
        groupId: 'group2',
    },
    {
        id: 'exp3',
        description: 'Groceries for the week',
        amount: 4500,
        category: 'Groceries',
        paidById: 'user4',
        splitWith: ['user1', 'user4', 'user5'],
        date: '2023-10-22T18:00:00Z',
        groupId: 'group2',
    },
     {
        id: 'exp4',
        description: 'Flight Tickets',
        amount: 15000,
        category: 'Travel',
        paidById: 'user1',
        splitWith: ['user1', 'user2', 'user3'],
        date: '2023-09-20T12:00:00Z',
        groupId: 'group1',
    },
    {
        id: 'exp5',
        description: 'Movie Night',
        amount: 1200,
        category: 'Entertainment',
        paidById: 'user3',
        splitWith: ['user1', 'user2', 'user3'],
        date: '2023-10-26T21:00:00Z',
        groupId: 'group1',
    },
];
