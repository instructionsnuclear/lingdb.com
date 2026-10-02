"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import ThemeToggle from "@/components/common/ThemeToggle";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";
import MobileNav from "./MobileNav";
import Dropdown, { DropdownItem } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";
import { MAIN_NAV_LINKS } from "@/lib/constants/navigation";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/tanstack/query-keys";
import { fetchPublicGlobals } from "@/lib/api/globals.api";
import {
  User as UserIcon,
  ShieldCheck,
  Shield,
  Settings,
  LogOut,
  Coins,
  LayoutDashboard,
  Languages,
  Gamepad2,
  Library,
  Trophy,
  FileText,
  Puzzle,
  BookOpen,
  Layers,
  GitFork,
  Globe,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Languages,
  Gamepad2,
  Library,
  Trophy,
  FileText,
  Puzzle,
  BookOpen,
  Layers,
  GitFork,
  Globe,
};

import { DynamicNavLink } from "@/lib/constants/globals-defaults";

export default function Header({ locale = "en" }: { locale?: string }) {
  const { user, profile, isLoading, signOut } = useUser();
  const pathname = usePathname();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  const { data: globalsData } = useQuery({
    queryKey: qk.globals.site,
    queryFn: fetchPublicGlobals,
    enabled: !pathname?.includes("/admin"),
    staleTime: 60_000,
  });

  const activeNavLinks: DynamicNavLink[] = (globalsData?.navLinks || MAIN_NAV_LINKS.map((link, idx) => ({
    id: `nav-${idx}`,
    href: link.href,
    labelKey: link.labelKey,
    icon: link.labelKey === "dashboard" ? "LayoutDashboard" : link.labelKey === "tools" ? "Languages" : "Gamepad2",
    authRequired: link.authRequired,
    enabled: true,
    order: idx + 1,
  }))).filter((link) => link.enabled && (!link.authRequired || Boolean(user)));

  const isActive = (path: string) => {
    if (path === "tools") {
      return (
        pathname.includes("/tools") ||
        pathname.includes("/playground") ||
        pathname.includes("/dialogue-trees")
      );
    }
    return pathname.includes(path);
  };

  // Hide header in admin panel (placed after all hooks)
  if (pathname?.includes("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 ">
        <div className="flex gap-3 mt-2">
          <div id="logo-wrap" className="flex items-center">
            <Link
              id="header-logo"
              href={user ? `/${locale}/dashboard` : `/${locale}`}
              className="flex items-center gap-2 text-3xl font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              <img src="/lingdbfav.png" alt="Lingdb" className="h-9 w-9 object-contain mb-1" />
              <span>
                {t("appName")}
              </span>
            </Link>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {activeNavLinks.map((link) => {
              const hrefWithLocale = `/${locale}${link.href}`;
              const IconComponent = ICON_MAP[link.icon] || Languages;
              const labelText = link.customLabel || (tNav.has(link.labelKey) ? tNav(link.labelKey) : link.labelKey);

              return (
                <Link
                  key={link.id || link.href}
                  href={hrefWithLocale}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-lg font-medium transition-colors",
                    isActive(link.href.split("/").pop()!)
                      ? "rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                      : "rounded-lg text-[var(--fg)]/60 hover:bg-[var(--surface)] hover:text-[var(--fg)]",
                  )}
                >
                  <IconComponent className="h-4 w-4" />
                  {labelText}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          {!isLoading && (
            <>
              {user ? (
                <div className="hidden items-center gap-3 md:flex">
                  <Dropdown
                    trigger={
                      <button className="cursor-pointer  flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-lg font-bold text-primary-600 transition-all hover:shadow-md dark:bg-primary-900/30 dark:text-primary-400">
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt={profile?.username || "User"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          profile?.username?.[0]?.toUpperCase() || "U"
                        )}
                      </button>
                    }
                  >
                    <div className="border-b border-[var(--border-color)] px-4 py-2">
                      <p className="text-lg font-semibold">
                        {profile?.username || "User"}
                      </p>
                      <p className="text-sm text-[var(--fg)]/40">
                        {profile?.email}
                      </p>
                    </div>
                    <DropdownItem
                      onClick={() =>
                        (window.location.href = `/${locale}/profile`)
                      }
                      id="profile-dropdown-item"
                    >
                      <UserIcon className="h-4 w-4" />
                      {tNav("profile")}
                    </DropdownItem>
                    {profile?.role === "ADMIN" && (
                      <DropdownItem
                        onClick={() =>
                          (window.location.href = `/${locale}/admin/overview`)
                        }
                        id="admin-panel-dropdown-item"
                        className="text-amber-600 dark:text-amber-400 font-semibold"
                      >
                        <Shield className="h-4 w-4" />
                        {tNav("panel")}
                      </DropdownItem>
                    )}
                    <DropdownItem
                      onClick={() =>
                        (window.location.href = `/${locale}/payment`)
                      }
                      id="upgrade-dropdown-item"
                      className="text-primary-600 dark:text-primary-400 font-semibold"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {t("upgrade_cta") || "Upgrade"}
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        (window.location.href = `/${locale}/profile/settings`)
                      }
                      id="settings-dropdown-item"
                    >
                      <Settings className="h-4 w-4" />
                      {t("settings")}
                    </DropdownItem>
                    <DropdownItem
                      onClick={async () => {
                        await signOut();
                        window.location.href = `/${locale}/login`;
                      }}
                      id="logout-dropdown-item"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("logout")}
                    </DropdownItem>
                  </Dropdown>
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-600 transition-colors dark:bg-amber-900/20 dark:text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span>{profile?.aiCredits ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link
                    href={`/${locale}/login`}
                    className="rounded-lg px-4 py-2 text-lg font-medium text-[var(--fg)]/70 transition-colors hover:text-[var(--fg)]"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href={`/${locale}/signup`}
                    className="rounded-xl bg-primary-500 px-4 py-2 text-lg font-semibold text-white transition-all hover:bg-primary-600 hover:shadow-lg active:scale-[0.97]"
                  >
                    {t("signup")}
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile hamburger */}
          <MobileNav
            locale={locale}
            isLoggedIn={!!user}
            navLinks={MAIN_NAV_LINKS.filter(
              (link) =>
                !link.href.includes("/blogs") &&
                !link.href.includes("/leaderboards"),
            ).map((link) => ({
              href: `/${locale}${link.href}`,
              label: tNav(link.labelKey),
              icon: link.icon,
            }))}
            profile={profile}
            user={user}
            signOut={signOut}
          />
        </div>
      </div>
    </header>
  );
}
