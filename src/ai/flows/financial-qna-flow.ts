
'use server';
/**
 * @fileOverview An AI agent that can answer questions about a user's financial data.
 *
 * - answerFinancialQuestion - A function that handles answering financial questions.
 * - FinancialQnAInput - The input type for the answerFinancialQuestion function.
 * - FinancialQnAOutput - The return type for the answerFinancialQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {Expense, Group, User, Balance} from '@/lib/types';

const MessageSchema = z.object({
  sender: z.enum(['user', 'ai']),
  text: z.string(),
});

const FinancialQnAInputSchema = z.object({
  question: z.string().describe("The user's current question about their finances."),
  history: z.array(MessageSchema).optional().describe("The recent conversation history."),
  context: z.object({
    expenses: z.array(z.any()).describe('A list of all expenses.'),
    groups: z.array(z.any()).describe('A list of all groups.'),
    users: z.array(z.any()).describe('A list of all users.'),
    balances: z.any().describe('The current balance and settlement information.'),
    currentUser: z.any().describe('The current logged-in user.'),
  }),
});
export type FinancialQnAInput = z.infer<typeof FinancialQnAInputSchema>;

const FinancialQnAOutputSchema = z.object({
  answer: z
    .string()
    .describe("A concise and helpful answer to the user's question."),
});
export type FinancialQnAOutput = z.infer<typeof FinancialQnAOutputSchema>;

export async function answerFinancialQuestion(
  input: FinancialQnAInput
): Promise<FinancialQnAOutput> {
  return financialQnAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialQnAPrompt',
  input: {schema: FinancialQnAInputSchema},
  output: {schema: FinancialQnAOutputSchema},
  prompt: `You are an expert financial consultant and accounts manager for an app called SettleSmart. Your persona is a super smart, chill financial whiz—like a GenZ homie who graduated top of their class from Harvard Business School. You're friendly, approachable, and use natural language, but you're also incredibly sharp and give data-driven advice.

  **IMPORTANT RULES:**
  1.  **Be Conversational:** If the user just says "hey" or "what's up?", just reply with a friendly greeting. DO NOT provide a financial summary unless they ask for it. Engage in normal conversation.
  2.  **Use Data ONLY When Asked:** Only analyze the provided JSON data when the user asks a specific question about their finances (e.g., "who do I owe?", "how much did I spend on food?", "what's my net balance?").
  3.  **Be Precise:** When you do provide financial information, base your answers strictly on the data provided below. Do not make up information.
  4.  **Keep it Real:** Your tone should be relaxed and helpful, not robotic or overly formal.

  The current user is: {{{json context.currentUser}}}

  Here is the full data context you should use to answer financial questions.
  - Users: {{{json context.users}}}
  - Groups: {{{json context.groups}}}
  - Expenses: {{{json context.expenses}}}
  - Balances: {{{json context.balances}}}

  {{#if history}}
  Here is the recent conversation history. Use it to understand the context of the user's current question.
  {{#each history}}
  - {{sender}}: {{text}}
  {{/each}}
  {{/if}}

  User's Current Question: "{{{question}}}"

  Based on all the provided data and the conversation history, provide a clear, direct, and chill answer.
  `,
});

const financialQnAFlow = ai.defineFlow(
  {
    name: 'financialQnAFlow',
    inputSchema: FinancialQnAInputSchema,
    outputSchema: FinancialQnAOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
