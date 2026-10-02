import {
  LayoutDashboard,
  Layers,
  Languages,
  Library,
  Trophy,
  FileText,
  Gamepad2,
  Puzzle,
  Settings,
  Users,
  ShieldCheck,
  BarChart,
  BarChart3,
  MessageSquare,
  Ticket,
  BookOpen,
  GitFork,
  Globe,
} from "lucide-react";

export const MAIN_NAV_LINKS = [
  {
    href: "/dashboard",
    labelKey: "dashboard",
    icon: LayoutDashboard,
    authRequired: true,
  },
  {
    href: "/tools",
    labelKey: "tools",
    icon: Languages,
    authRequired: false,
  },
  {
    href: "/games",
    labelKey: "games",
    icon: Gamepad2,
    authRequired: false,
  },
];

export const LEGAL_LINKS = [
  { href: "/privacy", labelKey: "privacy.title" },
  { href: "/terms", labelKey: "terms.title" },
  { href: "/cookies", labelKey: "cookies.title" },
];

export const ADMIN_NAV_LINKS = [
  {
    href: "/admin/overview",
    label: "Overview",
    icon: BarChart3,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/admin/dictionaries",
    label: "Dictionaries",
    icon: BookOpen,
  },
  {
    href: "/admin/blogs",
    label: "Blogs",
    icon: FileText,
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: Ticket,
  },
  {
    href: "/admin/wordle",
    label: "Wordle",
    icon: Puzzle,
  },
  {
    href: "/admin/globals",
    label: "Globals",
    icon: Globe,
  },
];
