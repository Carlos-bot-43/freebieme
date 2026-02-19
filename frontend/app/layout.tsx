import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreebieMe - Free Food Deals Near You",
  description: "Find birthday freebies, app deals, sign-up bonuses, and restaurant rewards near you. Updated daily.",
  keywords: ["free food", "restaurant deals", "birthday freebies", "food coupons", "app deals"],
  openGraph: {
    title: "FreebieMe - Free Food Deals Near You",
    description: "Birthday freebies, app deals & sign-up bonuses at restaurants near you.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
