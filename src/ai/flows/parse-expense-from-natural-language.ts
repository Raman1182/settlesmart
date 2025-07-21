'use server';
/**
 * @fileOverview Parses expense details from natural language input.
 *
 * - parseExpense - A function that takes a natural language expense description and returns structured expense details.
 * - ParseExpenseInput - The input type for the parseExpense function.
 * - ParseExpenseOutput - The return type for the parseExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseExpenseInputSchema = z.object({
  naturalLanguageInput: z
    .string()
    .describe('A natural language description of the expense.'),
});
export type ParseExpenseInput = z.infer<typeof ParseExpenseInputSchema>;

const ParseExpenseOutputSchema = z.object({
  amount: z.number().describe('The amount of the expense.'),
  participants: z
    .array(z.string())
    .describe('The names of the participants involved in the expense.'),
  description: z.string().describe('A short description of the expense.'),
});
export type ParseExpenseOutput = z.infer<typeof ParseExpenseOutputSchema>;

export async function parseExpense(input: ParseExpenseInput): Promise<ParseExpenseOutput> {
  return parseExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseExpensePrompt',
  input: {schema: ParseExpenseInputSchema},
  output: {schema: ParseExpenseOutputSchema},
  prompt: `You are an AI assistant that extracts expense information from natural language input.

  Given the following input, extract the amount, participants, and description of the expense. The current year is ${new Date().getFullYear()}.

  - The words "me", "I", or "I paid" should be interpreted as a participant named "you".
  - Extract all participant names mentioned.

  Example: "$50 for pizza with Alex and Ben" -> { amount: 50, participants: ["Alex", "Ben"], description: "Pizza" }
  Example: "I paid 1200 for last night's movie tickets for me, Chloe, and David" -> { amount: 1200, participants: ["you", "Chloe", "David"], description: "Movie tickets" }
  Example: "2000 rupees for dinner with me, Chloe, and Rachel" -> { amount: 2000, participants: ["you", "Chloe", "Rachel"], description: "Dinner" }

  Input: {{{naturalLanguageInput}}}

  Output the information in JSON format.`,
});

const parseExpenseFlow = ai.defineFlow(
  {
    name: 'parseExpenseFlow',
    inputSchema: ParseExpenseInputSchema,
    outputSchema: ParseExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
