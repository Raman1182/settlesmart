import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google'
import './globals.css';
import { SettleSmartProvider } from '@/context/settle-smart-context';
import { Toaster } from "@/components/ui/toaster"
import { CommandMenu } from '@/components/command-menu';
import { BottomNavbar } from '@/components/bottom-navbar';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans' 
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading'
})

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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <SettleSmartProvider>
          <div className="w-full h-screen">
            <div className="flex flex-col h-full">
              {children}
            </div>
          </div>
          <Toaster />
          <CommandMenu />
          {/* We'll conditionally render BottomNavbar based on auth state later if needed */}
          <BottomNavbar /> 
        </SettleSmartProvider>
      </body>
    </html>
  );
}
