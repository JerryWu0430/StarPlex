import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StartupProvider } from "@/contexts/StartupContext";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hostGrotesk = localFont({
  src: [
    {
      path: "../public/HostGrotesk-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-host-grotesk",
});

export const metadata: Metadata = {
  title: "StarPlex",
  description: "Test out your ideas.",
  icons: {
    icon: "/starplex.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <Analytics />
      <SpeedInsights />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hostGrotesk.variable} antialiased`}
        suppressHydrationWarning
      >
        <StartupProvider>
          {children}
        </StartupProvider>
      </body>
    </html>
  );
}
