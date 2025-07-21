'use server';
/**
 * @fileOverview Manages friend requests between users.
 *
 * - sendFriendRequest - Creates a pending friendship request.
 * - respondToFriendRequest - Updates a friendship status to accepted or rejected.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// --- Send Friend Request ---

const SendFriendRequestInputSchema = z.object({
  fromUserId: z.string(),
  toUserEmail: z.string().email(),
});
export type SendFriendRequestInput = z.infer<
  typeof SendFriendRequestInputSchema
>;

const SendFriendRequestOutputSchema = z.object({
  status: z.string(),
});
export type SendFriendRequestOutput = z.infer<
  typeof SendFriendRequestOutputSchema
>;

export async function sendFriendRequest(
  input: SendFriendRequestInput
): Promise<SendFriendRequestOutput> {
  // This flow now just acts as a pass-through in the mock environment.
  // The actual logic is handled in the context provider to avoid offline errors.
  return { status: 'pending' };
}

// --- Respond to Friend Request ---

const RespondToFriendRequestInputSchema = z.object({
  friendshipId: z.string(),
  response: z.enum(['accepted', 'rejected']),
});
export type RespondToFriendRequestInput = z.infer<
  typeof RespondToFriendRequestInputSchema
>;

const RespondToFriendRequestOutputSchema = z.object({
  status: z.string(),
});
export type RespondToFriendRequestOutput = z.infer<
  typeof RespondToFriendRequestOutputSchema
>;

export async function respondToFriendRequest(
  input: RespondToFriendRequestInput
): Promise<RespondToFriendRequestOutput> {
  return respondToFriendRequestFlow(input);
}

const respondToFriendRequestFlow = ai.defineFlow(
  {
    name: 'respondToFriendRequestFlow',
    inputSchema: RespondToFriendRequestInputSchema,
    outputSchema: RespondToFriendRequestOutputSchema,
  },
  async ({friendshipId, response}) => {
    const friendshipRef = doc(db, 'friendships', friendshipId);
    if (response === 'rejected') {
        await deleteDoc(friendshipRef);
    } else {
        await updateDoc(friendshipRef, {
            status: response,
        });
    }
    return {status: response};
  }
);
