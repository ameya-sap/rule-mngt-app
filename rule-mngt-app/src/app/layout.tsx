import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/Header';


export const metadata: Metadata = {
  title: 'RuleMaster',
  description: 'A modern business rule management application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <body className="font-body antialiased">
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          <main className="flex-1 container mx-auto p-4 md:p-8">{children}</main>
        </div>
        <Toaster />
      </body>
      </body>
    </html>
  );
}
