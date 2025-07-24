import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextJs} from '@genkit-ai/next';
import { NextRequest, NextResponse } from 'next/server';

import '@/ai/flows/parse-expense-from-natural-language';
import '@/ai/flows/categorize-expense';
import '@/ai/flows/financial-qna-flow';
import '@/ai/flows/shopping-list-flow';
import '@/ai/flows/financial-debrief-flow';
import '@/ai/flows/friendship-vibe-check-flow.ts';
import '@/ai/flows/email-reminder-flow.ts';
import '@/ai/flows/suggest-friends-flow.ts';
import { answerFinancialQuestion } from '@/ai/flows/financial-qna-flow';


genkit({
  plugins: [googleAI(), nextJs()],
  model: 'googleai/gemini-2.0-flash',
});

// Custom POST handler for /assistant
export async function POST(req) {
  // Only handle /assistant, otherwise fall back to default
  const url = req.nextUrl || req.url || '';
  if (typeof url === 'string' ? url.endsWith('/assistant') : url.pathname.endsWith('/assistant')) {
    const body = await req.json();
    // Validate and call the flow
    try {
      const result = await answerFinancialQuestion(body);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
    }
  }
  // Fallback to default handler for other routes
  return NextResponse.json({ error: 'Invalid route' }, { status: 404 });
}
