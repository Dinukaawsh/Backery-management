"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineBell,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineMap,
  HiOutlineTruck,
} from "react-icons/hi2";

import { ChatUnreadWatcher } from "@/components/ChatUnreadWatcher";
import { LocaleToggle } from "@/components/LocaleToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { features } from "@/lib/features";
import { useT } from "@/lib/i18n";
import type { EnMessages } from "@/lib/i18n/messages/en";
import { getMe, logout } from "@/lib/api";

type NavChild = {
  href: string;
  key: keyof EnMessages;
};

type NavItem = {
  href: string;
  key: keyof EnMessages;
  icon: IconType;
  children?: NavChild[];
};

const navItems: NavItem[] = [
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
    children: [
      { href: "/assignments/history", key: "nav.assignmentHistory" },
    ],
  },
  {
    href: "/shops",
    key: "nav.shops",
    icon: HiOutlineBuildingStorefront,
  },
  {
    href: "/calendar",
    key: "nav.calendar",
    icon: HiOutlineCalendarDays,
  },
  {
    href: "/tracking",
    key: "nav.liveMap",
    icon: HiOutlineMap,
  },
  {
    href: "/conversations",
    key: "nav.conversations",
    icon: HiOutlineChatBubbleLeftRight,
  },
  {
    href: "/notifications",
    key: "nav.notifications",
    icon: HiOutlineBell,
  },
  { href: "/settings", key: "nav.settings", icon: HiOutlineCog6Tooth },
];

const visibleNavItems = navItems.filter((item) => {
  if (item.href === "/tracking") return features.map;
  if (item.href === "/calendar") return features.calendar;
  if (item.href === "/conversations") return features.messages;
  return true;
});

function isExactOrChildPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveTitleKey(pathname: string): keyof EnMessages {
  const flat: Array<{ href: string; key: keyof EnMessages }> = [];
  for (const item of visibleNavItems) {
    flat.push({ href: item.href, key: item.key });
    for (const child of item.children ?? []) {
      flat.push({ href: child.href, key: child.key });
    }
  }
  flat.sort((a, b) => b.href.length - a.href.length);
  return (
    flat.find((item) => isExactOrChildPath(pathname, item.href))?.key ??
    "nav.adminFallback"
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useBusinessSettings();
  const t = useT();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);

  const currentPage = t(resolveTitleKey(pathname));

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMe();
      setProfileName(data.user.name);
      setProfileImageUrl(data.imageUrl?.trim() || null);
    } catch {
      // Keep previous profile if /me fails.
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, pathname]);

  useEffect(() => {
    function onProfileUpdated() {
      void loadProfile();
    }
    window.addEventListener("bakery:profile-updated", onProfileUpdated);
    return () => {
      window.removeEventListener("bakery:profile-updated", onProfileUpdated);
    };
  }, [loadProfile]);

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
      {features.messages ? (
        <ChatUnreadWatcher onCount={setChatUnread} />
      ) : null}
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
          <div className="mt-3 flex items-center gap-3">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={profileName ?? t("shell.adminPanel")}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-amber-200 lg:hidden"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-black">
                {t("shell.adminPanel")}
              </h1>
              {profileName ? (
                <p className="truncate text-sm text-amber-800">{profileName}</p>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = (item.children?.length ?? 0) > 0;
              const childActive = (item.children ?? []).some((child) =>
                isExactOrChildPath(pathname, child.href),
              );
              const parentActive =
                pathname === item.href ||
                (isExactOrChildPath(pathname, item.href) && !childActive);
              const groupOpen = parentActive || childActive;

              return (
                <div key={item.href} className="flex flex-col gap-1">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      parentActive
                        ? "bg-amber-600 text-white shadow-sm shadow-amber-700/20"
                        : groupOpen
                          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                          : "text-stone-800 hover:bg-amber-50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        parentActive
                          ? "bg-white/15"
                          : groupOpen
                            ? "bg-amber-100"
                            : "bg-amber-50"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                    {item.href === "/conversations" && chatUnread > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          parentActive
                            ? "bg-white text-amber-800"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {chatUnread > 9 ? "9+" : chatUnread}
                      </span>
                    ) : null}
                  </Link>

                  {hasChildren ? (
                    <div
                      className={`relative ml-4 space-y-1 border-l-2 border-amber-200 pl-3 ${
                        groupOpen ? "pb-1" : ""
                      }`}
                    >
                      {(item.children ?? []).map((child) => {
                        const active = isExactOrChildPath(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition ${
                              active
                                ? "bg-amber-600 font-semibold text-white shadow-sm"
                                : "text-stone-600 hover:bg-amber-50 hover:text-amber-900"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                active ? "bg-white" : "bg-amber-400"
                              }`}
                              aria-hidden
                            />
                            <span className="truncate">{t(child.key)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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
            <NotificationsBell />
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={profileName ?? ""}
                className="hidden h-9 w-9 rounded-full object-cover ring-2 ring-amber-200 lg:block"
              />
            ) : null}
            <LocaleToggle />
            <button
              type="button"
              aria-label={t("shell.logout")}
              onClick={() => setLogoutOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 text-red-600 hover:bg-red-50 lg:hidden"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
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
