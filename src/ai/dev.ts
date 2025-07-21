'use server';
import {config} from 'dotenv';
config();

import '@/ai/flows/parse-expense-from-natural-language.ts';
import '@/ai/flows/categorize-expense.ts';
import '@/ai/flows/financial-qna-flow.ts';
