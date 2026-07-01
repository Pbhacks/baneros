import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Shani OS",
    template: "%s | Shani OS",
  },
  description: "Browser-based OS with a polished desktop shell, browser workspace, and portfolio hub",
  applicationName: "Shani OS",
  keywords: ["shani os", "desktop", "browser", "portfolio", "next.js"],
  authors: [{ name: "Priyant Banerjee" }],
  creator: "Priyant Banerjee",
  publisher: "Priyant Banerjee",
  robots: {
    index: true,
    follow: true,
    nocache: true,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Shani OS",
    description: "Browser-based OS with a polished desktop shell, browser workspace, and portfolio hub",
    type: "website",
    siteName: "Shani OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shani OS",
    description: "Browser-based OS with a polished desktop shell, browser workspace, and portfolio hub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
