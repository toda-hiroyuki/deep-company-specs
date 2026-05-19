"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CompanyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/company/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "ログインに失敗しました");
      localStorage.setItem("company_token", data.token);
      router.replace("/company/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">事業者ログイン</h1>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
          Deep Experience 事業者管理画面
        </p>
        {error && (
          <p className="form-error" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}
        <div className="form-group">
          <label className="form-label">メールアドレス</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">パスワード</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%", marginTop: 8 }}
          disabled={loading}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          <Link
            href="/company/login/reset-password"
            style={{ color: "#60a5fa", textDecoration: "none" }}
          >
            パスワードをお忘れの方はこちら
          </Link>
        </p>
      </form>
    </div>
  );
}
