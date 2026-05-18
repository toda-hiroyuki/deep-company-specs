"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("admin@deepexperience.jp");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Login failed");
      localStorage.setItem("admin_token", data.token);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">{t("login.title")}</h1>
        {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
        <div className="form-group">
          <label className="form-label">{t("login.email")}</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t("login.password")}</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
