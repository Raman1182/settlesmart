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

const FinancialQnAInputSchema = z.object({
  question: z.string().describe('The user\'s question about their finances.'),
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
    .describe('A concise and helpful answer to the user\'s question.'),
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
  prompt: `You are an expert financial assistant for an app called SettleSmart. Your goal is to answer user questions based on the provided JSON data context. Be concise and friendly.

  The current user is: {{{json context.currentUser}}}

  Here is the full data context you should use to answer the question. Do not make up information. Base your answers solely on this data.

  - Users: {{{json context.users}}}
  - Groups: {{{json context.groups}}}
  - Expenses: {{{json context.expenses}}}
  - Balances: {{{json context.balances}}}

  User's Question: "{{{question}}}"

  Based on the data, provide a clear and direct answer.
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
