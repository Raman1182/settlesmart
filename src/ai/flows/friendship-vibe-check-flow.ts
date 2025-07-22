'use server';
/**
 * @fileOverview An AI agent that analyzes the financial relationship between two users.
 *
 * - generateFriendshipVibeCheck - A function that generates the analysis.
 * - FriendshipVibeCheckInput - The input type for the function.
 * - FriendshipVibeCheckOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { differenceInDays } from 'date-fns';

const FriendshipVibeCheckInputSchema = z.object({
  currentUser: z.any().describe("The current logged-in user."),
  friend: z.any().describe("The friend to analyze the relationship with."),
  expenses: z.array(z.any()).describe('A list of all shared expenses between the two users.'),
});
export type FriendshipVibeCheckInput = z.infer<typeof FriendshipVibeCheckInputSchema>;

const FriendshipVibeCheckOutputSchema = z.object({
    vibe: z.string().describe("A one or two-word summary of the financial vibe (e.g., 'Perfectly Balanced', 'Generous Giver', 'Silent Debtor')."),
    summary: z.string().describe("A short, fun, and insightful summary of the financial relationship, written in a chill, GenZ-like tone."),
    stats: z.object({
        netBalance: z.number().describe("The net balance between the two users. Positive if the friend owes the current user, negative if the current user owes the friend."),
        totalVolume: z.number().describe("The total amount of money transacted between the two users."),
        whoPaysMore: z.string().describe("The name of the person who pays for things more often."),
        avgSettleTimeDays: z.number().describe("The average number of days it takes for debts to be settled between them.")
    })
});
export type FriendshipVibeCheckOutput = z.infer<typeof FriendshipVibeCheckOutputSchema>;

// This function will perform some pre-calculation before calling the AI
export async function generateFriendshipVibeCheck(input: FriendshipVibeCheckInput): Promise<FriendshipVibeCheckOutput> {
  const { currentUser, friend, expenses } = input;

  let netBalance = 0;
  let totalVolume = 0;
  const paymentsMade: Record<string, number> = { [currentUser.id]: 0, [friend.id]: 0 };
  const settledExpenses: any[] = [];

  expenses.forEach(e => {
    totalVolume += e.amount;
    paymentsMade[e.paidById] = (paymentsMade[e.paidById] || 0) + 1;

    if (e.status === 'unsettled') {
      const amountPerPerson = e.amount / e.splitWith.length;
      if (e.paidById === currentUser.id) {
          netBalance += amountPerPerson; // friend owes me
      } else {
          netBalance -= amountPerPerson; // I owe friend
      }
    }

    if (e.status === 'settled' && e.settledAt) {
      settledExpenses.push(e);
    }
  });

  const avgSettleTimeDays = settledExpenses.length > 0
    ? Math.round(settledExpenses.reduce((sum, e) => sum + differenceInDays(new Date(e.settledAt!), new Date(e.date)), 0) / settledExpenses.length)
    : 0;
  
  const whoPaysMore = paymentsMade[currentUser.id] > paymentsMade[friend.id] ? currentUser.name : paymentsMade[friend.id] > paymentsMade[currentUser.id] ? friend.name : 'Equally';

  const stats = {
      netBalance,
      totalVolume,
      whoPaysMore,
      avgSettleTimeDays
  };

  // Now, call the AI with the pre-processed stats for the qualitative analysis
  return friendshipVibeCheckFlow({ ...input, stats });
}

const AIFlowInputSchema = FriendshipVibeCheckInputSchema.extend({
    stats: z.any()
});

const prompt = ai.definePrompt({
  name: 'friendshipVibeCheckPrompt',
  input: {schema: AIFlowInputSchema},
  output: {schema: FriendshipVibeCheckOutputSchema},
  prompt: `You are an expert financial analyst with the personality of a witty, sharp, and funny GenZ friend. Your task is to analyze the financial relationship between two people based on the provided data and pre-calculated stats.

  **IMPORTANT RULES:**
  1.  **Analyze the Vibe:** Based on the stats, determine the overall "vibe" of their financial relationship. Is it balanced? One-sided? Quick? Slow?
  2.  **Write a Fun Summary:** Create a short, engaging summary. It should be insightful but delivered in a chill, humorous tone.
  3.  **Use the Stats:** Your analysis must be based on the provided stats.
  4.  **Fill the Output:** Populate all fields in the output JSON, including re-stating the stats you were given.

  **Data Context:**
  - Current User: {{{json currentUser}}}
  - Friend: {{{json friend}}}
  - Shared Expenses: {{{json expenses}}}
  - **Pre-Calculated Stats to Use:** {{{json stats}}}

  Based on all the provided data, generate a fun and insightful "Friendship Vibe Check".
  `,
});

const friendshipVibeCheckFlow = ai.defineFlow(
  {
    name: 'friendshipVibeCheckFlow',
    inputSchema: AIFlowInputSchema,
    outputSchema: FriendshipVibeCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
