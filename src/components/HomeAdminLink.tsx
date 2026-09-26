"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HomeAdminLink() {
  return usePathname() === "/" ? <Link href="/admin/login">管理员入口</Link> : null;
}
