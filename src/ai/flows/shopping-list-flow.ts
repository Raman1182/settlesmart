'use server';
/**
 * @fileOverview An AI agent that can generate a shopping list from a prompt.
 *
 * - generateShoppingList - A function that generates a shopping list.
 * - ShoppingListInput - The input type for the generateShoppingList function.
 * - ShoppingListOutput - The return type for the generateShoppingList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShoppingListInputSchema = z.object({
  prompt: z.string().describe('The prompt for generating the shopping list.'),
});
export type ShoppingListInput = z.infer<typeof ShoppingListInputSchema>;

const ShoppingListItemSchema = z.object({
    id: z.string().describe('A unique ID for the shopping list item.'),
    name: z.string().describe('The name of the shopping list item.'),
    completed: z.boolean().describe('Whether the item has been purchased or not.'),
});

const ShoppingListOutputSchema = z.object({
  items: z.array(ShoppingListItemSchema).describe('The generated list of shopping items.'),
});
export type ShoppingListOutput = z.infer<typeof ShoppingListOutputSchema>;

export async function generateShoppingList(input: ShoppingListInput): Promise<ShoppingListOutput> {
  return shoppingListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shoppingListPrompt',
  input: {schema: ShoppingListInputSchema},
  output: {schema: ShoppingListOutputSchema},
  prompt: `You are an AI assistant that generates a helpful shopping list based on a user's request. Create a list of items based on the following prompt. For each item, give it a unique ID.

Prompt: {{{prompt}}}`,
});

const shoppingListFlow = ai.defineFlow(
  {
    name: 'shoppingListFlow',
    inputSchema: ShoppingListInputSchema,
    outputSchema: ShoppingListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
