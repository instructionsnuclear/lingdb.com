"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/tanstack/query-keys";
import { fetchAdminGlobals, updateAdminGlobals } from "@/lib/api/globals.api";
import {
  DEFAULT_SITE_GLOBALS,
  DynamicNavLink,
  DynamicFooterLink,
  SiteGlobalsData,
} from "@/lib/constants/globals-defaults";
import {
  Globe,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCcw,
  Check,
  Save,
  Navigation,
  FileText,
  LayoutDashboard,
  Languages,
  Gamepad2,
  Library,
  Trophy,
  Puzzle,
  BookOpen,
  Layers,
  GitFork,
  ShieldCheck,
  Link as LinkIcon,
} from "lucide-react";

const AVAILABLE_ICONS = [
  { name: "LayoutDashboard", icon: LayoutDashboard },
  { name: "Languages", icon: Languages },
  { name: "Gamepad2", icon: Gamepad2 },
  { name: "Library", icon: Library },
  { name: "Trophy", icon: Trophy },
  { name: "FileText", icon: FileText },
  { name: "Puzzle", icon: Puzzle },
  { name: "BookOpen", icon: BookOpen },
  { name: "Layers", icon: Layers },
  { name: "GitFork", icon: GitFork },
  { name: "ShieldCheck", icon: ShieldCheck },
  { name: "Globe", icon: Globe },
];

export default function GlobalsManagementClient({
  initialGlobals,
}: {
  initialGlobals: SiteGlobalsData;
}) {
  const queryClient = useQueryClient();

  const { data: globalsData } = useQuery({
    queryKey: qk.admin.globals,
    queryFn: fetchAdminGlobals,
    initialData: initialGlobals,
  });

  const [activeTab, setActiveTab] = useState<"nav" | "footer">("nav");
  const [navLinks, setNavLinks] = useState<DynamicNavLink[]>(
    globalsData?.navLinks || DEFAULT_SITE_GLOBALS.navLinks
  );
  const [footerLinks, setFooterLinks] = useState<DynamicFooterLink[]>(
    globalsData?.footerLinks || DEFAULT_SITE_GLOBALS.footerLinks
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New item modal form state
  const [showNavModal, setShowNavModal] = useState(false);
  const [newNav, setNewNav] = useState<Partial<DynamicNavLink>>({
    href: "",
    labelKey: "",
    customLabel: "",
    icon: "Languages",
    authRequired: false,
    enabled: true,
  });

  const [showFooterModal, setShowFooterModal] = useState(false);
  const [newFooter, setNewFooter] = useState<Partial<DynamicFooterLink>>({
    href: "",
    labelKey: "",
    customLabel: "",
    category: "legal",
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: (payload: SiteGlobalsData) => updateAdminGlobals(payload),
    onSuccess: (data) => {
      setNavLinks(data.navLinks);
      setFooterLinks(data.footerLinks);
      queryClient.invalidateQueries({ queryKey: qk.admin.globals });
      queryClient.invalidateQueries({ queryKey: qk.globals.site });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Failed to update global settings");
      setTimeout(() => setSaveError(null), 4000);
    },
  });

  const handleSave = () => {
    mutation.mutate({ navLinks, footerLinks });
  };

  const handleReset = () => {
    if (
      confirm("Are you sure you want to reset navbar and footer links to default?")
    ) {
      setNavLinks(DEFAULT_SITE_GLOBALS.navLinks);
      setFooterLinks(DEFAULT_SITE_GLOBALS.footerLinks);
    }
  };

  // Nav link order handlers
  const moveNav = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= navLinks.length) return;
    const updated = [...navLinks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setNavLinks(updated);
  };

  const toggleNavEnabled = (index: number) => {
    const updated = [...navLinks];
    updated[index].enabled = !updated[index].enabled;
    setNavLinks(updated);
  };

  const deleteNav = (index: number) => {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  };

  const addNav = () => {
    if (!newNav.href) return;
    const item: DynamicNavLink = {
      id: `nav-${Date.now()}`,
      href: newNav.href,
      labelKey: newNav.labelKey || newNav.href.replace("/", ""),
      customLabel: newNav.customLabel || undefined,
      icon: newNav.icon || "Languages",
      authRequired: Boolean(newNav.authRequired),
      enabled: Boolean(newNav.enabled ?? true),
      order: navLinks.length + 1,
    };
    setNavLinks([...navLinks, item]);
    setShowNavModal(false);
    setNewNav({
      href: "",
      labelKey: "",
      customLabel: "",
      icon: "Languages",
      authRequired: false,
      enabled: true,
    });
  };

  // Footer link order handlers
  const moveFooter = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= footerLinks.length) return;
    const updated = [...footerLinks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFooterLinks(updated);
  };

  const toggleFooterEnabled = (index: number) => {
    const updated = [...footerLinks];
    updated[index].enabled = !updated[index].enabled;
    setFooterLinks(updated);
  };

  const deleteFooter = (index: number) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== index));
  };

  const addFooter = () => {
    if (!newFooter.href) return;
    const item: DynamicFooterLink = {
      id: `foot-${Date.now()}`,
      href: newFooter.href,
      labelKey: newFooter.labelKey || newFooter.href.replace("/", ""),
      customLabel: newFooter.customLabel || undefined,
      category: newFooter.category || "legal",
      enabled: Boolean(newFooter.enabled ?? true),
      order: footerLinks.length + 1,
    };
    setFooterLinks([...footerLinks, item]);
    setShowFooterModal(false);
    setNewFooter({
      href: "",
      labelKey: "",
      customLabel: "",
      category: "legal",
      enabled: true,
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Globals</h1>
          <p className="text-[var(--fg)]/60">
            Dynamically customize navigation links, footer sections, and site structure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface)] active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 font-medium">
          {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab("nav")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === "nav"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]"
          }`}
        >
          <Navigation className="h-4 w-4" />
          Navbar Links ({navLinks.length})
        </button>
        <button
          onClick={() => setActiveTab("footer")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 font-semibold text-sm transition-colors ${
            activeTab === "footer"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-[var(--fg)]/60 hover:text-[var(--fg)]"
          }`}
        >
          <FileText className="h-4 w-4" />
          Footer Links ({footerLinks.length})
        </button>
      </div>

      {/* Navbar Section */}
      {activeTab === "nav" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Header Navigation Bar</h2>
            <button
              onClick={() => setShowNavModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Nav Link
            </button>
          </div>

          <div className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden">
            {navLinks.map((item, index) => {
              const IconComp =
                AVAILABLE_ICONS.find((i) => i.name === item.icon)?.icon ||
                Languages;
              return (
                <div
                  key={item.id || index}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button
                        disabled={index === 0}
                        onClick={() => moveNav(index, "up")}
                        className="p-1 hover:text-primary-500 disabled:opacity-20"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={index === navLinks.length - 1}
                        onClick={() => moveNav(index, "down")}
                        className="p-1 hover:text-primary-500 disabled:opacity-20"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold">
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {item.customLabel || item.labelKey}
                        </span>
                        {item.labelKey && (
                          <span className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--fg)]/50">
                            key: {item.labelKey}
                          </span>
                        )}
                        {item.authRequired && (
                          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            Auth Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono text-[var(--fg)]/50">
                        {item.href}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => toggleNavEnabled(index)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        item.enabled
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {item.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      onClick={() => deleteNav(index)}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Section */}
      {activeTab === "footer" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Footer Navigation Links</h2>
            <button
              onClick={() => setShowFooterModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Footer Link
            </button>
          </div>

          <div className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden">
            {footerLinks.map((item, index) => (
              <div
                key={item.id || index}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => moveFooter(index, "up")}
                      className="p-1 hover:text-primary-500 disabled:opacity-20"
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={index === footerLinks.length - 1}
                      onClick={() => moveFooter(index, "down")}
                      className="p-1 hover:text-primary-500 disabled:opacity-20"
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                    <LinkIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">
                        {item.customLabel || item.labelKey}
                      </span>
                      <span className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--fg)]/50">
                        Category: {item.category}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-[var(--fg)]/50">
                      {item.href}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => toggleFooterEnabled(index)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      item.enabled
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-500/20 text-gray-500"
                    }`}
                  >
                    {item.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => deleteFooter(index)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Nav Modal */}
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg)] p-6 shadow-2xl space-y-4">
            <h3 className="text-2xl font-bold">Add Nav Link</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Href Path
                </label>
                <input
                  type="text"
                  placeholder="/custom-page"
                  value={newNav.href}
                  onChange={(e) => setNewNav({ ...newNav, href: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Translation Key or Custom Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. tools or My Custom Page"
                  value={newNav.customLabel || newNav.labelKey}
                  onChange={(e) =>
                    setNewNav({
                      ...newNav,
                      labelKey: e.target.value,
                      customLabel: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Icon
                </label>
                <select
                  value={newNav.icon}
                  onChange={(e) => setNewNav({ ...newNav, icon: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                >
                  {AVAILABLE_ICONS.map((i) => (
                    <option key={i.name} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newNav.authRequired}
                    onChange={(e) =>
                      setNewNav({ ...newNav, authRequired: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Requires Auth
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newNav.enabled}
                    onChange={(e) =>
                      setNewNav({ ...newNav, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Enabled
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowNavModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                onClick={addNav}
                className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Footer Modal */}
      {showFooterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg)] p-6 shadow-2xl space-y-4">
            <h3 className="text-2xl font-bold">Add Footer Link</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Href Path
                </label>
                <input
                  type="text"
                  placeholder="/privacy"
                  value={newFooter.href}
                  onChange={(e) =>
                    setNewFooter({ ...newFooter, href: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Label
                </label>
                <input
                  type="text"
                  placeholder="Privacy Policy"
                  value={newFooter.customLabel || newFooter.labelKey}
                  onChange={(e) =>
                    setNewFooter({
                      ...newFooter,
                      labelKey: e.target.value,
                      customLabel: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-[var(--fg)]/60">
                  Category
                </label>
                <select
                  value={newFooter.category}
                  onChange={(e) =>
                    setNewFooter({
                      ...newFooter,
                      category: e.target.value as "legal" | "quickLinks",
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3 text-sm"
                >
                  <option value="legal">Legal</option>
                  <option value="quickLinks">Quick Links</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowFooterModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                onClick={addFooter}
                className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
