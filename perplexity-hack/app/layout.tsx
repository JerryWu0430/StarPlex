import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StartupProvider } from "@/contexts/StartupContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const aeonikTrial = localFont({
  src: [
    {
      path: "../public/AeonikTRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-aeonik-trial",
});

export const metadata: Metadata = {
  title: "StarPlex",
  description: "Test out your ideas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${aeonikTrial.variable} antialiased`}
        suppressHydrationWarning
      >
        <StartupProvider>
          {children}
        </StartupProvider>
      </body>
    </html>
  );
}
