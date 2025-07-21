import type {Metadata} from 'next';
import './globals.css';
import { SettleSmartProvider } from '@/context/settle-smart-context';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'SettleSmart',
  description: 'Track shared expenses and settle balances with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SettleSmartProvider>
          {children}
          <Toaster />
        </SettleSmartProvider>
      </body>
    </html>
  );
}
