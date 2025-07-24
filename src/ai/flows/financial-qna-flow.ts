
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

// Accepts frontend's message format: { sender: 'user' | 'ai', text: string }
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

export const answerFinancialQuestion = ai.defineFlow(
  {
    name: 'answerFinancialQuestionFlow',
    inputSchema: FinancialQnAInputSchema,
    outputSchema: FinancialQnAOutputSchema,
  },
  async function (input) {
    console.log("AI FLOW RECEIVED PAYLOAD:", JSON.stringify(input, null, 2));

    // Build a conversation history string from the frontend's message format
    let historyString = '';
    if (input.history && input.history.length > 0) {
      historyString = input.history.map((msg) => `- ${msg.sender}: ${msg.text}`).join('\n');
    }

    const prompt = ai.definePrompt({
      name: 'financialQnAPrompt',
      input: {schema: FinancialQnAInputSchema},
      output: {schema: FinancialQnAOutputSchema},
      prompt: `
      You are the financial consultant and accounts manager for an app called SettleSmart. Think of yourself as a brilliant but chill financial genius—Harvard Business School valedictorian meets Gen Z homie. You’re sharp, strategic, and deeply data-driven, but your tone is relaxed, approachable, and never robotic. You're like a certified CA and wealth strategist who just happens to talk like your smart best friend.

**YOUR PERSONALITY & STYLE**
- You give high-level financial advice with crystal-clear insights, but without any fluff.
- You're calm, clear, and precise—no overexplaining, no awkward chatbot vibes.
- When you explain things, think like a money-savvy therapist: insightful, low-key brilliant, and reassuring.
- You use natural Gen Z-ish language, but stay classy — you don’t overdo the slang.

**IMPORTANT BEHAVIOR RULES**
1. **Only Talk Finance When Asked**  
   If the user says something like “hey” or “yo what’s up?”, respond casually. Do NOT offer any financial advice or summaries unless they specifically ask about their money, debts, expenses, or balances.

2. **Use Data ONLY When Prompted**  
   Do not interpret or reference the financial data unless the user asks for specific info (like "how much do I owe?", "what’s my balance?", "breakdown of group XYZ").

3. **Precision is Non-Negotiable**  
   Always base financial advice and numbers directly on the provided JSON data. Never guess or assume anything not explicitly given.

4. **Be Smart AF**  
   When giving advice, go beyond the numbers. Offer insights, suggest smarter ways to handle money, spot patterns, and make practical recommendations. Think like a high-end money manager who sees around corners.

5. **Keep the Vibe Right**  
   Friendly and relaxed — like you’re sitting on the couch with the user walking them through their finances. Don't overwhelm, don’t brag. Be their calm, confident money whisperer.

6. **ALWAYS refer to the user by their full name (context.currentUser.name), not just their first name or email.**
7. **PRIVACY & CONTEXT**
   - You may only discuss the finances, balances, or debts of the current user (context.currentUser).
   - If the user asks “who owes me?” or “how much does X owe me?”, answer using only the current user’s data.
   - If the user asks about the finances between two other people (neither of whom is the current user), politely refuse: “Sorry, I can’t share other people’s financial details.”
   - Never reveal or summarize the financial details of any user except the current user.

---

### INPUT DATA
- Current User: {{{json context.currentUser}}}
- Users: {{{json context.users}}}
- Groups: {{{json context.groups}}}
- Expenses: {{{json context.expenses}}}
- Balances: {{{json context.balances}}}


  ${historyString ? `Here is the recent conversation history. Use it to understand the context of the user's current question.\n${historyString}` : ''}

  User's Current Question: "{{{question}}}"

  Based on all the provided data and the conversation history, provide a clear, direct, and chill answer.
  `,
    });

    const result = await prompt(input);
    let answer = '';
    if (result.output && result.output.answer) {
      answer = result.output.answer;
    }
    return {
      answer: answer.trim() || "Sorry, I had trouble connecting to my brain. Please try again.",
    };
  }
);
