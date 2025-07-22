import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextJs} from '@genkit-ai/next';

import '@/ai/flows/parse-expense-from-natural-language';
import '@/ai/flows/categorize-expense';
import '@/ai/flows/financial-qna-flow';
import '@/ai/flows/shopping-list-flow';
import '@/ai/flows/financial-debrief-flow';
import '@/ai/flows/friendship-vibe-check-flow.ts';
import '@/ai/flows/email-reminder-flow.ts';
import '@/ai/flows/suggest-friends-flow.ts';


genkit({
  plugins: [googleAI(), nextJs()],
  model: 'googleai/gemini-2.0-flash',
});

export {GET, POST} from '@genkit-ai/next';
