'use server';
/**
 * @fileOverview An AI agent that generates a friendly email reminder for an outstanding debt.
 *
 * - generateEmailReminder - A function that generates the email content.
 * - EmailReminderInput - The input type for the function.
 * - EmailReminderOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmailReminderInputSchema = z.object({
  currentUser: z.any().describe("The user who is owed money."),
  friend: z.any().describe("The user who owes the money."),
  expense: z.any().describe('The specific expense that is outstanding.'),
  amountOwed: z.number().describe('The specific amount owed for this expense.'),
});
export type EmailReminderInput = z.infer<typeof EmailReminderInputSchema>;

const EmailReminderOutputSchema = z.object({
    subject: z.string().describe("A short, friendly, and slightly funny subject line for the email."),
    body: z.string().describe("The full email body. It should be written in a chill, non-confrontational, GenZ-like tone. It should clearly state the amount owed and what it was for, but in a very casual way."),
});
export type EmailReminderOutput = z.infer<typeof EmailReminderOutputSchema>;


export async function generateEmailReminder(input: EmailReminderInput): Promise<EmailReminderOutput> {
  return emailReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emailReminderPrompt',
  input: {schema: EmailReminderInputSchema},
  output: {schema: EmailReminderOutputSchema},
  prompt: `You are an AI assistant who is an expert at writing friendly but effective reminders. Your persona is a super chill, slightly funny GenZ friend. Your task is to write a short email to remind someone about an outstanding debt.

  **IMPORTANT RULES:**
  1.  **Be Chill, Not Corporate:** The tone should be very casual and friendly. Avoid corporate jargon.
  2.  **Be Clear:** Gently remind the person how much they owe and what it was for.
  3.  **Be Funny (but not mean):** A little humor goes a long way. The goal is to get the money back without ruining a friendship.
  4.  **Create a good subject line:** It should be catchy and not sound like a bill.

  **Data Context:**
  - Person sending reminder (currentUser): {{{json currentUser}}}
  - Person who owes money (friend): {{{json friend}}}
  - The specific expense: {{{json expense}}}
  - Amount this person owes: {{{amountOwed}}}

  Based on the data, generate a subject and body for the reminder email.
  `,
});

const emailReminderFlow = ai.defineFlow(
  {
    name: 'emailReminderFlow',
    inputSchema: EmailReminderInputSchema,
    outputSchema: EmailReminderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
