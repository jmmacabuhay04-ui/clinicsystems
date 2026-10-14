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
  title: "BCAS CLINIC",
  description: "medical",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Base font size ng buong app. Lahat ng Tailwind sizes (text, padding,
      // width, atbp.) ay nakabase sa rem, kaya ito lang ang papalitan para
      // lumaki o lumiit ang lahat. 100% = default (16px).
      style={{ fontSize: "85%" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}