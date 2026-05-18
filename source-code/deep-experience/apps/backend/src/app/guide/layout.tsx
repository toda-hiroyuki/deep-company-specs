"use client";

import { usePathname } from "next/navigation";

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/guide/login") {
    return <>{children}</>;
  }

  return (
    <div>
      <header className="guide-header">
        <h1>DeepExperience Guide</h1>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: "#9ca3af", borderColor: "#4b5563" }}
          onClick={() => {
            localStorage.removeItem("guide_token");
            window.location.href = "/guide/login";
          }}
        >
          Logout
        </button>
      </header>
      <div className="guide-content">{children}</div>
    </div>
  );
}
