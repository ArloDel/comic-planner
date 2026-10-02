import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
