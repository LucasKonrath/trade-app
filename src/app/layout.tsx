import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mulligan",
  description: "Descarte, compre e troque cartas com o pessoal da sua lojinha.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${spaceGrotesk.variable}`}
      data-theme="dark"
    >
      <body suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <SessionProvider>
            <Nav />
            <main className="page">{children}</main>
            <Footer />
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
