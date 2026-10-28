import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

// Font ng buong system: Poppins (bilugan, malinis at madaling basahin).
// 400 = normal, 500 = medium, 600 = semibold, 700 = bold (para sa malalaking title lang).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
      className={`${poppins.variable} ${geistMono.variable} h-full font-sans antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}