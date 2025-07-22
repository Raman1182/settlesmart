'use server';
import {config} from 'dotenv';
config();

import '@/ai/flows/parse-expense-from-natural-language.ts';
import '@/ai/flows/categorize-expense.ts';
import '@/ai/flows/financial-qna-flow.ts';
import '@/ai/flows/shopping-list-flow.ts';
import '@/ai/flows/financial-debrief-flow.ts';
import '@/ai/flows/friendship-vibe-check-flow.ts';
import '@/ai/flows/email-reminder-flow.ts';
