"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useI18n, Locale } from "@/lib/i18n";

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", background: "none", border: "1px solid #374151", borderRadius: 6,
          padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6, color: "#d1d5db", fontSize: 13,
        }}
      >
        <span style={{ fontSize: 14 }}>🌐</span>
        {locale === "ja" ? "日本語" : "English"}
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, marginBottom: 4, width: "100%",
          background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 50, overflow: "hidden",
        }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLocale(opt.value); setOpen(false); }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "8px 14px", border: "none", background: "none",
                color: "#d1d5db", fontSize: 13, cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#374151")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {opt.label}
              {locale === opt.value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Don't wrap login page in sidebar layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const NAV_ITEMS = [
    { href: "/admin/dashboard", label: t("nav.dashboard"), icon: (
      // Bar chart / dashboard icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    )},
    { href: "/admin/bookings", label: t("nav.bookings"), icon: (
      // Calendar icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    )},
    { href: "/admin/tours", label: t("nav.tours"), icon: (
      // Compass / tour icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    )},
    { href: "/admin/spots", label: t("nav.spots"), icon: (
      // Map pin icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    )},
    { href: "/admin/guides", label: t("nav.guides"), icon: (
      // Person icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    )},
    { href: "/admin/guests", label: t("nav.guests"), icon: (
      // Globe / traveler icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    )},
    { href: "/admin/admins", label: t("nav.admins"), icon: (
      // Users group icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
    { href: "/admin/media", label: t("nav.media"), icon: (
      // Image icon
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
    )},
  ];

  return (
    <div className="admin-layout">
      <nav className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <div className="sidebar-title">DeepExperience</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname.startsWith(item.href) ? "active" : ""}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-bottom">
          <div style={{ marginBottom: 8 }}>
            <LanguageSwitcher />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: "100%", color: "#9ca3af" }}
            onClick={() => {
              localStorage.removeItem("admin_token");
              window.location.href = "/admin/login";
            }}
          >
            {t("nav.logout")}
          </button>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
