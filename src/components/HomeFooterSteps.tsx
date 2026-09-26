"use client";

import { usePathname } from "next/navigation";

export function HomeFooterSteps() {
  if (usePathname() !== "/") return null;

  return <section className="home-steps" aria-label="使用步骤">
    <div><b>01</b><strong>写下问题</strong><span>选项和截止时间，由你来定。</span></div>
    <div><b>02</b><strong>分享链接</strong><span>一条给大家投票，一条留给自己看结果。</span></div>
    <div><b>03</b><strong>看见答案</strong><span>实时了解大家的选择，结束后保留记录。</span></div>
  </section>;
}
