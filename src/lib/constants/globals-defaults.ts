export interface DynamicNavLink {
  id: string;
  href: string;
  labelKey: string;
  customLabel?: string;
  icon: string;
  authRequired: boolean;
  enabled: boolean;
  order: number;
}

export interface DynamicFooterLink {
  id: string;
  href: string;
  labelKey: string;
  customLabel?: string;
  category: "legal" | "quickLinks";
  enabled: boolean;
  order: number;
}

export interface SiteGlobalsData {
  navLinks: DynamicNavLink[];
  footerLinks: DynamicFooterLink[];
}

export const DEFAULT_SITE_GLOBALS: SiteGlobalsData = {
  navLinks: [
    {
      id: "nav-dashboard",
      href: "/dashboard",
      labelKey: "dashboard",
      icon: "LayoutDashboard",
      authRequired: true,
      enabled: true,
      order: 1,
    },
    {
      id: "nav-tools",
      href: "/tools",
      labelKey: "tools",
      icon: "Languages",
      authRequired: false,
      enabled: true,
      order: 2,
    },
    {
      id: "nav-games",
      href: "/games",
      labelKey: "games",
      icon: "Gamepad2",
      authRequired: false,
      enabled: true,
      order: 3,
    },
    {
      id: "nav-library",
      href: "/library",
      labelKey: "library",
      icon: "Library",
      authRequired: false,
      enabled: false,
      order: 4,
    },
    {
      id: "nav-leaderboards",
      href: "/leaderboards",
      labelKey: "leaderboards",
      icon: "Trophy",
      authRequired: false,
      enabled: false,
      order: 5,
    },
    {
      id: "nav-blogs",
      href: "/blogs",
      labelKey: "blogs",
      icon: "FileText",
      authRequired: false,
      enabled: false,
      order: 6,
    },
  ],
  footerLinks: [
    {
      id: "foot-privacy",
      href: "/privacy",
      labelKey: "privacy.title",
      category: "legal",
      enabled: true,
      order: 1,
    },
    {
      id: "foot-terms",
      href: "/terms",
      labelKey: "terms.title",
      category: "legal",
      enabled: true,
      order: 2,
    },
    {
      id: "foot-cookies",
      href: "/cookies",
      labelKey: "cookies.title",
      category: "legal",
      enabled: true,
      order: 3,
    },
  ],
};
