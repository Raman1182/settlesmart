import { config } from 'dotenv';
config();

import '@/ai/flows/parse-expense-from-natural-language.ts';
import '@/ai/flows/categorize-expense.ts';