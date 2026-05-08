import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://freebieme.vercel.app'),
  title: "FreebieMe — Free Food Deals Near You",
  description: "Birthday freebies, app deals, sign-up bonuses, and restaurant rewards at 38+ chains across 79 US cities. Always free, no sign-up.",
  keywords: ["free food", "restaurant deals", "birthday freebies", "food coupons", "app deals", "free meals"],
  openGraph: {
    title: "FreebieMe — Free Food Deals Near You",
    description: "Birthday freebies, app deals & sign-up bonuses near you. Always free.",
    type: "website",
    siteName: "FreebieMe",
    url: "https://freebieme.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "FreebieMe — Free Food Deals Near You",
    description: "Birthday freebies, app deals & sign-up bonuses near you. Always free.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-[#FAF7F2] text-stone-900`}>
        {children}
      </body>
    </html>
  );
}
