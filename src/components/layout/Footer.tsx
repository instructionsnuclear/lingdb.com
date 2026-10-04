"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Instagram, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/tanstack/query-keys";
import { fetchPublicGlobals } from "@/lib/api/globals.api";
import { DynamicFooterLink } from "@/lib/constants/globals-defaults";
import { LEGAL_LINKS } from "@/lib/constants/navigation";

export default function Footer({ locale = "en" }: { locale?: string }) {
  const pathname = usePathname();
  const t = useTranslations("legal");
  const nt = useTranslations("nav");
  const currentYear = new Date().getFullYear();

  const { data: globalsData } = useQuery({
    queryKey: qk.globals.site,
    queryFn: fetchPublicGlobals,
    staleTime: 60_000,
  });

  const activeFooterLinks: DynamicFooterLink[] = (
    globalsData?.footerLinks ||
    LEGAL_LINKS.map((link, idx) => ({
      id: `foot-${idx}`,
      href: link.href,
      labelKey: link.labelKey,
      category: "legal",
      enabled: true,
      order: idx + 1,
    }))
  ).filter((link) => link.enabled);

  // Hide footer on playground or dialogue-trees infinite canvas page or admin panel
  if (
    pathname?.includes("/playground") ||
    pathname?.includes("/dialogue-trees") ||
    pathname?.includes("/admin")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg)]/80 backdrop-blur-xl">
      {/* Ad banner slot */}
      <div id="footer-ad-slot" className="mx-auto max-w-7xl px-4 pt-4" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Column 1: Brand */}
          <div className="flex flex-col gap-4">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-3xl font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              <span>Lingdb</span>
            </Link>
            <p className="text-sm text-[var(--fg)]/40">
              &copy; {currentYear} Lingdb. All rights reserved.
            </p>
          </div>

          {/* Column 2: Legal / Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-[var(--fg)]">
              {nt("legal")}
            </h3>
            <nav className="flex flex-col gap-2">
              {activeFooterLinks.map((link) => {
                const labelText =
                  link.customLabel ||
                  (t.has(link.labelKey) ? t(link.labelKey) : link.labelKey);

                return (
                  <Link
                    key={link.id || link.href}
                    href={`/${locale}${link.href}`}
                    className="text-md text-[var(--fg)]/60 transition-colors hover:text-primary-500"
                  >
                    {labelText}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Column 3: Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-[var(--fg)]">
              {nt("contact")}
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:team@lingdb.com"
                className="flex items-center gap-2 text-md text-[var(--fg)]/60 transition-colors hover:text-primary-500"
              >
                <Mail className="h-4 w-4" />
                team@lingdb.com
              </a>
              <a
                href="https://instagram.com/lingdb_ingilizce"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-md text-[var(--fg)]/60 transition-colors hover:text-primary-500"
              >
                <Instagram className="h-4 w-4" />
                lingdb
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
