import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreebieMe - Free Food Deals Near You",
  description: "Find birthday freebies, app deals, sign-up bonuses, and restaurant rewards near you — at 50+ US cities. Updated regularly.",
  keywords: ["free food", "restaurant deals", "birthday freebies", "food coupons", "app deals", "free meals", "Starbucks birthday", "Chick-fil-A rewards"],
  openGraph: {
    title: "FreebieMe - Free Food Deals Near You",
    description: "Birthday freebies, app deals & sign-up bonuses at restaurants near you — always free.",
    type: "website",
    siteName: "FreebieMe",
  },
  twitter: {
    card: "summary",
    title: "FreebieMe - Free Food Deals Near You",
    description: "Birthday freebies, app deals & sign-up bonuses at 50+ US cities. Always free.",
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
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
