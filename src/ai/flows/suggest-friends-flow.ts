'use server';
/**
 * @fileOverview An AI agent that suggests friends to split an expense with based on past behavior.
 *
 * - suggestFriendsForExpense - A function that returns a list of suggested friend IDs.
 * - SuggestFriendsInput - The input type for the function.
 * - SuggestFriendsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFriendsInputSchema = z.object({
  expenseDescription: z.string().describe("The description of the new expense."),
  friends: z.array(z.any()).describe("A list of all the current user's friends."),
  pastExpenses: z.array(z.any()).describe("A list of the user's past expenses to learn from."),
  currentUser: z.any().describe("The current logged-in user."),
});
export type SuggestFriendsInput = z.infer<typeof SuggestFriendsInputSchema>;

const SuggestFriendsOutputSchema = z.object({
    suggestedFriendIds: z.array(z.string()).describe("A list of friend IDs who are likely participants for this expense. The list can be empty if no relevant pattern is found."),
});
export type SuggestFriendsOutput = z.infer<typeof SuggestFriendsOutputSchema>;


export async function suggestFriendsForExpense(input: SuggestFriendsInput): Promise<SuggestFriendsOutput> {
  // If there are no past expenses, don't bother calling the AI.
  if (input.pastExpenses.length === 0) {
    return { suggestedFriendIds: [] };
  }
  return suggestFriendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFriendsPrompt',
  input: {schema: SuggestFriendsInputSchema},
  output: {schema: SuggestFriendsOutputSchema},
  prompt: `You are an intelligent assistant for the SettleSmart app. Your goal is to suggest which friends should be included in a new expense based on the user's past spending habits.

  **Analyze the Data:**
  1.  Look at the **new expense description**: \`{{{expenseDescription}}}\`
  2.  Examine the user's **past expenses**: {{{json pastExpenses}}}
  3.  Identify past expenses that are similar to the new one (e.g., "coffee", "lunch", "rent").
  4.  See which friends were most frequently included in those similar past expenses.
  5.  Your suggestions should only include friends from the provided list of the user's current friends: {{{json friends}}}
  6.  The current user is: {{{json currentUser}}}

  **Output:**
  Based on your analysis, return a list of friend IDs who are the most likely participants for this new expense. It's okay to return an empty list if there's no strong pattern.
  `,
});

const suggestFriendsFlow = ai.defineFlow(
  {
    name: 'suggestFriendsFlow',
    inputSchema: SuggestFriendsInputSchema,
    outputSchema: SuggestFriendsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
