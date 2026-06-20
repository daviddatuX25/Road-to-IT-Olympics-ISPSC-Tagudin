import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Road to IT Olympics — Practice Loop",
  description: "Weekly AI-guided practice, streak-based leaderboard, and a real proctored gate for the 15th IT Skills Olympics delegation.",
  keywords: ["IT Skills Olympics", "practice", "leaderboard", "streaks", "competition prep"],
  authors: [{ name: "Road to IT Olympics" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Road to IT Olympics",
    description: "Practice loop + proctored gate for the 15th IT Skills Olympics",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Road to IT Olympics",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
