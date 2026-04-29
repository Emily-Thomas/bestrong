import type { Metadata } from 'next';
import { Geist, Geist_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Milo - Your AI Training Companion',
  description: 'Smart programming for coaches who care. Build personalized training plans faster, without losing your coaching touch.',
  keywords: ['fitness', 'training', 'AI', 'gym management', 'workout programming', 'personal training'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        />
      </head>
      <body
        className={`${manrope.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
