import type { Metadata } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

// Display face — bold, condensed, uppercase. Carries the "RIFT" identity
// in headlines and the wordmark, echoing the angular logo mark.
const fontDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI face — quiet and highly legible for dense leaderboard data.
const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Utility face — ranks, timestamps, stats, badges. Reinforces the
// "competitive data" feel anywhere a number needs to read precisely.
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RIFT CLAN — Compete. Challenge. Conquer.",
    template: "%s — RIFT CLAN",
  },
  description:
    "RIFT is a competitive gaming community where players fight for their position, defend their rank, and climb to the top across Valorant, Roblox, Minecraft, Counter-Strike 2, and Brawlhalla.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "RIFT CLAN — Compete. Challenge. Conquer.",
    description:
      "Live competitive leaderboards, player-vs-player challenges, and rank history for the RIFT gaming community.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} min-h-screen`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
