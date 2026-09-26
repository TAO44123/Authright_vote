import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeAdminLink } from "@/components/HomeAdminLink";
import { HomeFooterSteps } from "@/components/HomeFooterSteps";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Authright_Voting｜让选择更有意思", template: "%s｜Authright_Voting" },
  description: "发起一场有趣的限时投票，分享链接，让大家一起决定。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/" aria-label="Authright_Voting，返回首页">Authright_Voting<span className="brand-dot">.</span></Link>
            <nav className="site-nav" aria-label="主导航">
              <Link href="/create">发起投票</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <Suspense fallback={null}><HomeFooterSteps /></Suspense>
          <div className="site-footer-meta"><span>Authright_Voting / MAKE A CHOICE</span><Suspense fallback={null}><HomeAdminLink /></Suspense></div>
        </footer>
      </body>
    </html>
  );
}
