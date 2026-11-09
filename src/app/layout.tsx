import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zen-kaku",
});

export const metadata: Metadata = {
  title: "ComicPlan - Manga & Comic Purchasing Planner",
  description: "Personal manga and comic purchasing planner with Shopee import and budget tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={zenKaku.variable}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        <TopLoadingBar />
        {children}
      </body>
    </html>
  );
}
