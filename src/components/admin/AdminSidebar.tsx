"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { ADMIN_NAV_LINKS } from "@/lib/constants/navigation";
import ThemeToggle from "@/components/common/ThemeToggle";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import { cn } from "@/lib/utils/cn";

export default function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header (only on screens smaller than lg) */}
      <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface)]/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--fg)]/70 hover:bg-[var(--bg)] hover:text-[var(--fg)] active:scale-95"
            aria-label="Toggle admin navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href={`/${locale}/admin/overview`} className="flex items-center gap-2">
            <img src="/lingdbfav.png" alt="Lingdb" className="h-7 w-7 object-contain" />
            <span className="font-bold text-lg">Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)]/70 hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            App
          </Link>
        </div>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--border-color)] px-5">
              <div className="flex items-center gap-2.5">
                <img src="/lingdbfav.png" alt="Lingdb" className="h-7 w-7 object-contain" />
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-tight">Lingdb</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Admin Panel
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-[var(--fg)]/50 hover:bg-[var(--bg)] hover:text-[var(--fg)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {ADMIN_NAV_LINKS.map((item) => {
                const href = `/${locale}${item.href}`;
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all",
                      isActive
                        ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                        : "text-[var(--fg)]/70 hover:bg-[var(--bg)] hover:text-[var(--fg)]"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-[var(--border-color)] p-4">
              <Link
                href={`/${locale}/dashboard`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--bg)] text-[var(--fg)]/70 hover:text-[var(--fg)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Lingdb
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--surface)] lg:flex z-30">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border-color)] px-6">
          <Link href={`/${locale}/admin/overview`} className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <img src="/lingdbfav.png" alt="Lingdb" className="h-8 w-8 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">Lingdb</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Admin Panel
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {ADMIN_NAV_LINKS.map((item) => {
            const href = `/${locale}${item.href}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-semibold transition-all",
                  isActive
                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                    : "text-[var(--fg)]/70 hover:bg-[var(--bg)] hover:text-[var(--fg)]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls & back link */}
        <div className="space-y-3 border-t border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between px-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--bg)] text-[var(--fg)]/70 hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Lingdb
          </Link>
        </div>
      </aside>
    </>
  );
}
