import type {Metadata} from 'next';
import { Inter } from 'next/font/google'
import './globals.css';
import { SettleSmartProvider } from '@/context/settle-smart-context';
import { Toaster } from "@/components/ui/toaster"
import { CommandMenu } from '@/components/command-menu';
import { BottomNavbar } from '@/components/bottom-navbar';
import { AppSidebar } from '@/components/app-sidebar';

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
      <body className="font-sans antialiased bg-background text-foreground">
        <SettleSmartProvider>
          <div className="md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] w-full h-screen">
            <AppSidebar />
            <div className="flex flex-col">
              {children}
            </div>
          </div>
          <Toaster />
          <CommandMenu />
          <BottomNavbar />
        </SettleSmartProvider>
      </body>
    </html>
  );
}
