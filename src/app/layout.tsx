import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import RequiredFields from "@/components/shared/required-fields";
import NoAutofill from "@/components/shared/no-autofill";

// Pangunahing font ng buong system: Poppins
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
      style={{ fontSize: "95%" }}
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Lahat ng input sa mga form ay required (pulang * at error kapag blangko) */}
        <RequiredFields />
        {/* Lahat ng input: autoComplete="off" (maliban sa Log In) */}
        <NoAutofill />
        {children}
      </body>
    </html>
  );
}