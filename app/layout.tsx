import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  weight: ["500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commons",
  description: "A workshop for shared decisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex justify-center bg-team-blue-soft px-4 py-8 font-sans text-ink max-[480px]:p-0">
        {children}
      </body>
    </html>
  );
}
