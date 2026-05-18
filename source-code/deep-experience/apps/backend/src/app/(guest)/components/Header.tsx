"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Bell, Menu, X, MapPin, Globe, Heart, HelpCircle, Gift, User, LogOut, ChevronDown } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import { useGuestAuth } from "@/lib/guest-auth";

function LanguageDropdown() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: Locale; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "ja", label: "日本語", flag: "🇯🇵" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
        title="Language"
      >
        <Globe className="w-[22px] h-[22px]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLocale(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                locale === opt.value
                  ? "text-red-700 bg-red-50 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{opt.flag}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { guest, logout } = useGuestAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 ml-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <User className="w-5 h-5 text-gray-700" />
        <span className="text-sm font-medium text-gray-700">
          {t("guest.auth.greeting", { name: guest?.firstName || "" })}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
          <Link
            href="/me"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("guest.me.title")}
          </Link>
          <Link
            href="/me/bookings"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("guest.nav.myBookings")}
          </Link>
          <Link
            href="/me/favorites"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("guest.me.nav.favorites")}
          </Link>
          <Link
            href="/me/profile"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("guest.me.nav.profile")}
          </Link>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-100 mt-1 pt-2.5"
          >
            <LogOut className="w-4 h-4" />
            {t("guest.auth.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  const { isLoggedIn, guest, logout, loading: authLoading } = useGuestAuth();

  const navItems = [
    { href: "/", label: t("guest.nav.explore") },
    { href: "/tours", label: t("guest.nav.tours") },
    { href: "/me/bookings", label: t("guest.nav.myBookings") },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[60px]">
          {/* Logo + Nav left side */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <MapPin className="w-5 h-5 text-red-700" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                DEEP<span className="text-red-700">Experience</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors py-1 border-b-2 ${
                    pathname === item.href
                      ? "text-red-700 border-red-700"
                      : "text-gray-600 border-transparent hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side — Viator style icon row */}
          <div className="flex items-center gap-2">
            <LanguageDropdown />

            <Link
              href="/me/favorites"
              className="hidden sm:flex p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              title="Favorites"
            >
              <Heart className="w-[22px] h-[22px]" />
            </Link>

            <button
              className="hidden sm:flex p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              title="Help"
            >
              <HelpCircle className="w-[22px] h-[22px]" />
            </button>

            <button
              className="hidden lg:flex p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              title="Rewards"
            >
              <Gift className="w-[22px] h-[22px]" />
            </button>

            <Link
              href="/notifications"
              className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-[22px] h-[22px]" />
            </Link>

            {!authLoading && (
              isLoggedIn ? (
                <div className="hidden sm:block">
                  <UserMenu />
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:block ml-3 px-6 py-2.5 bg-red-700 hover:bg-red-800 !text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {t("guest.nav.logIn")}
                </Link>
              )
            )}

            <button
              className="md:hidden ml-1 p-2 rounded-full text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-100 pt-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                  pathname === item.href
                    ? "text-red-700 bg-red-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!authLoading && (
              isLoggedIn ? (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full mt-2 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg text-left flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t("guest.auth.logout")} ({guest?.firstName})
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className="block w-full mt-2 px-4 py-3 bg-red-700 !text-white text-sm font-semibold rounded-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("guest.nav.logIn")}
                </Link>
              )
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
