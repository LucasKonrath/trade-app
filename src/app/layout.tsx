import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mulligan",
  description: "Descarte, compre e troque cartas com o pessoal do seu LGS.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={geistSans.variable}>
      <body suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <SessionProvider>
            <Nav />
            <main className="page">{children}</main>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
