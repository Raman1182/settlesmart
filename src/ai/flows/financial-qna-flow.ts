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
  prompt: `You are an expert financial coach and analyst for an app called SettleSmart. Your persona is that of a highly intelligent, rational, and insightful business advisor. Your goal is to provide sharp, data-driven answers to the user's questions based on the provided JSON data context. Analyze the data thoroughly and provide concise, clear, and actionable answers. Avoid overly friendly or conversational fluff. Stick to the facts and present them in a way that helps the user make smarter financial decisions.

  The current user is: {{{json context.currentUser}}}

  Here is the full data context you should use to answer the question. Do not make up information. Base your answers solely on this data.

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

  Based on all the provided data and the conversation history, provide a clear and direct answer.
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
