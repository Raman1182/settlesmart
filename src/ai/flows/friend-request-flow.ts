
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
  friendshipId: z.string().optional(),
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
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', toUserEmail));
        const toUserSnapshot = await getDocs(q);

        if (toUserSnapshot.empty) {
            throw new Error('User with that email does not exist.');
        }
        const toUser = { id: toUserSnapshot.docs[0].id, ...toUserSnapshot.docs[0].data()};

        if (toUser.id === fromUserId) {
            throw new Error("You can't send a request to yourself.");
        }
        
        const friendshipsRef = collection(db, 'friendships');
        const existingQuery = query(friendshipsRef, where('userIds', 'in', [[fromUserId, toUser.id], [toUser.id, fromUserId]]));
        const existingSnapshot = await getDocs(existingQuery);

        if(!existingSnapshot.empty) {
            throw new Error("You are already friends or a request is pending.");
        }
        
        const docRef = await addDoc(friendshipsRef, {
            userIds: [fromUserId, toUser.id],
            status: 'pending',
            requestedBy: fromUserId,
            createdAt: serverTimestamp(),
        });
        
        return { status: 'pending', friendshipId: docRef.id };
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
