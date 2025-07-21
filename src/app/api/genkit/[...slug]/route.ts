import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import nextJs from '@genkit-ai/next';

import '@/ai/flows/parse-expense-from-natural-language';
import '@/ai/flows/categorize-expense';
import '@/ai/flows/financial-qna-flow';
import '@/ai/flows/shopping-list-flow';

genkit({
  plugins: [googleAI(), nextJs()],
  model: 'googleai/gemini-2.0-flash',
});

export {GET, POST} from '@genkit-ai/next';
