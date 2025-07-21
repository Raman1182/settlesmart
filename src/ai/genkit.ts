import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextJs} from '@genkit-ai/next';

export const ai = genkit({
  plugins: [googleAI(), nextJs()],
  model: 'googleai/gemini-2.0-flash',
});
