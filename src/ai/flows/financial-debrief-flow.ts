'use server';
/**
 * @fileOverview An AI agent that can generate a financial debrief for the user.
 *
 * - generateFinancialDebrief - A function that handles generating the debrief.
 * - FinancialDebriefInput - The input type for the generateFinancialDebrief function.
 * - FinancialDebriefOutput - The return type for the generateFinancialDebrief function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialDebriefInputSchema = z.object({
  context: z.object({
    expenses: z.array(z.any()).describe('A list of all expenses.'),
    groups: z.array(z.any()).describe('A list of all groups.'),
    users: z.array(z.any()).describe('A list of all users.'),
    balances: z.any().describe('The current balance and settlement information.'),
    currentUser: z.any().describe('The current logged-in user.'),
  }),
});
export type FinancialDebriefInput = z.infer<typeof FinancialDebriefInputSchema>;

const InsightSchema = z.object({
  title: z.string().describe("A short, catchy title for the insight."),
  emoji: z.string().describe("An emoji that represents the insight."),
  analysis: z.string().describe("A detailed, friendly, and helpful analysis of the user's financial behavior, written in a chill, GenZ-like tone."),
});

const FinancialDebriefOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, one-sentence summary of the user's financial situation."),
  insights: z.array(InsightSchema).describe('A list of 3-4 key insights about the user\'s spending, settlements, and group dynamics.'),
});
export type FinancialDebriefOutput = z.infer<typeof FinancialDebriefOutputSchema>;

export async function generateFinancialDebrief(
  input: FinancialDebriefInput
): Promise<FinancialDebriefOutput> {
  return financialDebriefFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialDebriefPrompt',
  input: {schema: FinancialDebriefInputSchema},
  output: {schema: FinancialDebriefOutputSchema},
  prompt: `You are an expert financial consultant and accounts manager for an app called SettleSmart. Your persona is a super smart, chill financial whiz—like a GenZ homie who graduated top of their class from Harvard Business School. You're friendly, approachable, and use natural language, but you're also incredibly sharp and give data-driven advice.

  Your task is to provide a "Financial Debrief" for the user based on the provided JSON data. Analyze their spending habits, group dynamics, and settlement behavior.

  **IMPORTANT RULES:**
  1.  **Analyze Everything:** Look at the expenses, who owes who, which groups are most active, and how quickly people settle up.
  2.  **Generate 3-4 Key Insights:** Distill your analysis into 3 or 4 of the most interesting or important insights.
  3.  **Keep it Chill & Actionable:** For each insight, provide a friendly analysis. The tone should be relaxed and helpful, not robotic or overly formal. Use emojis to make it engaging.
  4.  **Be Data-Driven:** Base your answers strictly on the data provided below. Do not make up information.
  5.  **Be Creative with Titles:** Give each insight a fun, catchy title.

  The current user is: {{{json context.currentUser}}}

  Here is the full data context you must use to generate the debrief.
  - Users: {{{json context.users}}}
  - Groups: {{{json context.groups}}}
  - Expenses: {{{json context.expenses}}}
  - Balances: {{{json context.balances}}}

  Based on all the provided data, generate a helpful and insightful financial debrief.
  `,
});

const financialDebriefFlow = ai.defineFlow(
  {
    name: 'financialDebriefFlow',
    inputSchema: FinancialDebriefInputSchema,
    outputSchema: FinancialDebriefOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
