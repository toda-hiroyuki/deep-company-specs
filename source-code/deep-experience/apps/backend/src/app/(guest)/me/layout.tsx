"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Heart, User as UserIcon } from "lucide-react";
import { useGuestAuth } from "@/lib/guest-auth";
import { useI18n } from "@/lib/i18n";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { isLoggedIn, loading: authLoading, guest } = useGuestAuth();

  // Gate: redirect unauthenticated users to login.
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isLoggedIn, pathname, router]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-700 rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { href: "/me/bookings", label: t("guest.me.nav.bookings"), icon: Calendar },
    { href: "/me/favorites", label: t("guest.me.nav.favorites"), icon: Heart },
    { href: "/me/profile", label: t("guest.me.nav.profile"), icon: UserIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("guest.me.title")}
        </h1>
        {guest && (
          <p className="text-gray-500 mt-1">
            {t("guest.auth.greeting", {
              name: `${guest.firstName} ${guest.lastName}`.trim(),
            })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
        <nav className="md:sticky md:top-24 md:self-start">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-red-50 text-red-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
