import type {Metadata} from 'next';
import { Inter } from 'next/font/google'
import './globals.css';
import { SettleSmartProvider } from '@/context/settle-smart-context';
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'SettleSmart | Shared Expense Tracker',
  description: 'The smartest way to track shared expenses and settle balances with friends and groups.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SettleSmartProvider>
          {children}
          <Toaster />
        </SettleSmartProvider>
      </body>
    </html>
  );
}
