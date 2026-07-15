"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineBuildingStorefront,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineTruck,
} from "react-icons/hi2";

import { LocaleToggle } from "@/components/LocaleToggle";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { useT } from "@/lib/i18n";
import { logout } from "@/lib/api";

const navHrefs: Array<{ href: string; key: string; icon: IconType }> = [
  { href: "/dashboard", key: "nav.dashboard", icon: HiOutlineChartBarSquare },
  { href: "/products", key: "nav.products", icon: HiOutlineCube },
  { href: "/sales", key: "nav.sales", icon: HiOutlineCurrencyDollar },
  {
    href: "/delivery-guys",
    key: "nav.deliveryPartners",
    icon: HiOutlineTruck,
  },
  {
    href: "/assignments",
    key: "nav.stockAssignments",
    icon: HiOutlineClipboardDocumentList,
  },
  { href: "/shops", key: "nav.shops", icon: HiOutlineBuildingStorefront },
  { href: "/settings", key: "nav.settings", icon: HiOutlineCog6Tooth },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useBusinessSettings();
  const t = useT();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPageKey =
    navHrefs.find((item) => pathname.startsWith(item.href))?.key ??
    "nav.adminFallback";
  const currentPage = t(currentPageKey as Parameters<typeof t>[0]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  return (
    <div className="admin-shell h-screen overflow-hidden bg-amber-50">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label={t("shell.closeSidebarAria")}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-amber-200 bg-white transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="shrink-0 border-b border-amber-100 px-6 py-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-700">
            <HiOutlineBuildingStorefront className="h-4 w-4" />
            {settings.businessName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-black">
            {t("shell.adminPanel")}
          </h1>
        </div>

        <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {navHrefs.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-amber-600 text-white"
                      : "text-black hover:bg-amber-100"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {t(item.key as Parameters<typeof t>[0])}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-amber-100 p-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <HiOutlineArrowRightOnRectangle className="h-5 w-5 shrink-0" />
            {t("shell.logout")}
          </button>
        </div>
      </aside>

      <div className="flex h-screen flex-col lg:ml-64">
        <header className="z-20 flex shrink-0 items-center justify-between border-b border-amber-200 bg-white px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t("shell.menu")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 text-black lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <HiOutlineBars3 className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">
                {settings.businessName}
              </p>
              <h2 className="text-lg font-semibold text-black">{currentPage}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 lg:hidden"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
              {t("shell.logout")}
            </button>
          </div>
        </header>

        <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {children}
        </main>
      </div>

      <ConfirmModal
        open={logoutOpen}
        title={t("shell.logoutConfirmTitle")}
        message={t("shell.logoutConfirmMessage")}
        confirmLabel={t("shell.logout")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
