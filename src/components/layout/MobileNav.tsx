"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Menu,
  X,
  User as UserIcon,
  Settings,
  LogOut,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ThemeToggle from "@/components/common/ThemeToggle";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import type { User } from "@supabase/supabase-js";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileNavProps {
  locale: string;
  isLoggedIn: boolean;
  navLinks: NavLink[];
  profile: {
    tier?: string;
    username?: string;
    email?: string;
    aiCredits?: number;
    role?: string;
  } | null;
  user: User | null;
  signOut: () => Promise<void>;
}

export default function MobileNav({
  locale,
  isLoggedIn,
  navLinks,
  profile,
  user,
  signOut,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  useGSAP(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // GSAP Animation for opening
      gsap.fromTo(
        menuRef.current,
        { y: "-100%", opacity: 0 },
        { y: "0%", opacity: 1, duration: 0.5, ease: "power4.out" },
      );
      gsap.fromTo(
        contentRef.current?.children || [],
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          delay: 0.2,
          ease: "back.out(1.7)",
        },
      );
    } else {
      document.body.style.overflow = "";
    }
  }, { dependencies: [isOpen], scope: menuRef });

  const closeMenu = () => {
    gsap.to(menuRef.current, {
      y: "-100%",
      opacity: 0,
      duration: 0.4,
      ease: "power4.in",
      onComplete: () => setIsOpen(false),
    });
  };

  const isActive = (path: string) => pathname.includes(path);

  const menuContent = isOpen && (
    <div
      ref={menuRef}
      className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col bg-[var(--bg)] p-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={isLoggedIn ? `/${locale}/dashboard` : `/${locale}`}
          onClick={closeMenu}
          className="flex items-center gap-2 text-2xl font-bold tracking-tight"
        >
          <img src="/lingdbfav.png" alt="Lingdb" className="h-8 w-8 object-contain" />
          <span>
            {profile?.tier === "PREMIUM" ? t("premium") : t("appName")}
          </span>
        </Link>
        <button
          onClick={closeMenu}
          className="rounded-full p-3 bg-[var(--surface)] text-[var(--fg)] hover:scale-110 transition-transform"
          aria-label="Close menu"
        >
          <X className="h-8 w-8" />
        </button>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex flex-col gap-6">
        {/* Main Links */}
        <div className="grid gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={cn(
                "flex items-center gap-4 p-4 text-xl font-medium transition-all active:scale-[0.98]",
                isActive(link.href.split("/").pop()!)
                  ? "rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                  : "rounded-2xl bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface)]/80",
              )}
            >
              <link.icon className="h-6 w-6" />
              {link.label}
            </Link>
          ))}

          {isLoggedIn && (
            <>
              <Link
                href={`/${locale}/profile`}
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-4 rounded-2xl p-4 text-xl font-medium transition-all active:scale-[0.98]",
                  isActive("profile") && !pathname.includes("settings")
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface)]/80",
                )}
              >
                <UserIcon className="h-6 w-6" />
                {tNav("profile")}
              </Link>
              <Link
                href={`/${locale}/payment`}
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-4 rounded-2xl p-4 text-xl font-bold transition-all active:scale-[0.98]",
                  isActive("payment")
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20",
                )}
              >
                <ShieldCheck className="h-6 w-6" />
                {t("upgrade_cta") || "Upgrade"}
              </Link>
              <Link
                href={`/${locale}/profile/settings`}
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-4 rounded-2xl p-4 text-xl font-medium transition-all active:scale-[0.98]",
                  isActive("settings")
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface)]/80",
                )}
              >
                <Settings className="h-6 w-6" />
                {t("settings")}
              </Link>
              {profile?.role === "ADMIN" && (
                <Link
                  href={`/${locale}/admin/overview`}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 text-xl font-medium transition-all active:scale-[0.98]",
                    isActive("admin")
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
                  )}
                >
                  <ShieldCheck className="h-6 w-6" />
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        {/* Profile Info & Credits */}
        {isLoggedIn && profile && (
          <div className="rounded-3xl bg-gradient-to-br from-primary-500/10 to-purple-500/10 p-6 border border-primary-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 flex items-center justify-center overflow-hidden rounded-full bg-primary-500 text-white font-bold text-xl shadow-inner shadow-black/20">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={profile.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile.username?.[0]?.toUpperCase() || "U"
                )}
              </div>
              <div>
                <p className="font-bold text-lg">{profile.username}</p>
                <p className="text-sm opacity-60">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="font-medium">{t("credits")}</span>
              </div>
              <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
                {profile.aiCredits}
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[var(--surface)]/50">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("theme")}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("language")}</span>
            <LocaleSwitcher />
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="mt-4">
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await signOut();
                closeMenu();
                window.location.href = `/${locale}/login`;
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 p-4 text-xl font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.98]"
            >
              <LogOut className="h-6 w-6" />
              {t("logout")}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/${locale}/login`}
                onClick={closeMenu}
                className="flex items-center justify-center rounded-2xl bg-[var(--surface)] p-4 text-xl font-bold transition-all hover:bg-[var(--surface)]/80 active:scale-[0.98]"
              >
                {t("login")}
              </Link>
              <Link
                href={`/${locale}/signup`}
                onClick={closeMenu}
                className="flex items-center justify-center rounded-2xl bg-primary-500 p-4 text-xl font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 text-[var(--fg)]/60 hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
}
