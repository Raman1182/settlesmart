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
  friendshipId: z.string(),
  status: z.string(),
});
export type SendFriendRequestOutput = z.infer<
  typeof SendFriendRequestOutputSchema
>;

export async function sendFriendRequest(
  input: SendFriendRequestInput
): Promise<SendFriendRequestOutput> {
  return sendFriendRequestFlow(input);
}

const sendFriendRequestFlow = ai.defineFlow(
  {
    name: 'sendFriendRequestFlow',
    inputSchema: SendFriendRequestInputSchema,
    outputSchema: SendFriendRequestOutputSchema,
  },
  async ({fromUserId, toUserEmail}) => {
    // 1. Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', toUserEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('User with that email does not exist.');
    }
    const toUserDoc = querySnapshot.docs[0];
    const toUserId = toUserDoc.id;

    if (fromUserId === toUserId) {
        throw new Error("You can't send a friend request to yourself.");
    }

    // 2. Check for existing friendship
    const friendshipsRef = collection(db, 'friendships');
    const existingQuery = query(friendshipsRef, where('userIds', 'array-contains', fromUserId));
    const existingSnapshot = await getDocs(existingQuery);
    
    const alreadyExists = existingSnapshot.docs.some(doc => doc.data().userIds.includes(toUserId));

    if (alreadyExists) {
        throw new Error("You are already friends or a request is pending.");
    }

    // 3. Create new friendship document
    const friendshipDocRef = await addDoc(friendshipsRef, {
      userIds: [fromUserId, toUserId],
      status: 'pending',
      requestedBy: fromUserId,
      createdAt: serverTimestamp(),
    });

    return {
      friendshipId: friendshipDocRef.id,
      status: 'pending',
    };
  }
);

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
    await updateDoc(friendshipRef, {
      status: response,
    });
    return {status: response};
  }
);
