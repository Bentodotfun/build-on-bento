import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0e1116",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulse.fun"),
  title: "Pulse — Swipe Sports",
  description:
    "Live 5-minute prediction markets on Bento. Swipe, back a call, and watch it resolve before the next one lands.",
  openGraph: {
    title: "Pulse — Swipe Sports",
    description:
      "Live markets that create and resolve themselves at match tempo. Swipe, back a call, one tap on Bento.",
    siteName: "Pulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse — Swipe Sports",
    description: "Live markets that create and resolve themselves at match tempo. Swipe, back a call, one tap on Bento.",
  },
  appleWebApp: { capable: true, title: "Pulse", statusBarStyle: "black-translucent" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Keyframes injected raw — Tailwind v4 prunes @keyframes referenced only via inline styles. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes swipefinger{0%{transform:translateX(46px) rotate(-8deg);opacity:0}15%{opacity:1}55%{transform:translateX(-58px) rotate(-8deg);opacity:1}80%{transform:translateX(-74px) rotate(-8deg);opacity:0}100%{opacity:0}}
@keyframes swipepulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.35);opacity:0}}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
