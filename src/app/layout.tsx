import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade App",
  description: "Trade TCG cards with players at your LGS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body suppressHydrationWarning>
        <SessionProvider>
          <Nav />
          <main className="page">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
