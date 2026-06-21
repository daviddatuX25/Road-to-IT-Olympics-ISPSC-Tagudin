import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Road to IT Olympics — The Forge",
  description: "Weekly AI-guided practice, streak-based leaderboard, and a real proctored gate for the 15th IT Skills Olympics delegation.",
  keywords: ["IT Skills Olympics", "practice", "leaderboard", "streaks", "competition prep"],
  authors: [{ name: "Road to IT Olympics" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Road to IT Olympics — The Forge",
    description: "Practice loop + proctored gate for the 15th IT Skills Olympics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Road to IT Olympics — The Forge",
    description: "Practice loop + proctored gate for the 15th IT Skills Olympics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script to apply the saved theme BEFORE React hydrates, avoiding a flash.
  const themeScript = `(function(){try{var t=localStorage.getItem('ito-theme');if(t&&t!=='olympics'&&['cyberpunk','formal','terminal'].includes(t)){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`
  
  const swRegisterScript = `
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(reg) {
          console.log('ServiceWorker registered with scope: ', reg.scope);
        }).catch(function(err) {
          console.warn('ServiceWorker registration failed: ', err);
        });
      });
    }
  `

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#6d28d9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swRegisterScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
