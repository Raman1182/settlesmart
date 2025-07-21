
import type { User, Group, Expense } from './types';

// NOTE: This data is now for mock purposes and will be replaced by Firestore data.
// The user array is especially important as a fallback for `findUserById` until all data is in Firestore.
export const users: User[] = [
  { id: 'user1', name: 'You', email: 'you@example.com', avatar: 'https://placehold.co/100x100/64748b/ffffff.png', initials: 'U' },
  { id: 'user2', name: 'Alex', email: 'alex@example.com', avatar: 'https://placehold.co/100x100/ec4899/ffffff.png', initials: 'A' },
  { id: 'user3', name: 'Ben', email: 'ben@example.com', avatar: 'https://placehold.co/100x100/8b5cf6/ffffff.png', initials: 'B' },
  { id: 'user4', name: 'Chloe', email: 'chloe@example.com', avatar: 'https://placehold.co/100x100/14b8a6/ffffff.png', initials: 'C' },
  { id: 'user5', name: 'David', email: 'david@example.com', avatar: 'https://placehold.co/100x100/f59e0b/ffffff.png', initials: 'D' },
];

export const groups: Group[] = [];
export const expenses: Expense[] = [];
