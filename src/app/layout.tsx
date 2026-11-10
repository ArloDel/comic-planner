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

const THEME_INIT_SCRIPT = `(function(){try{var k='comicplan_theme',v=localStorage.getItem(k);var d=v==='dark'||(v!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={zenKaku.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 antialiased font-sans">
        <TopLoadingBar />
        {children}
      </body>
    </html>
  );
}
