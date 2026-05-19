"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "request" | "sent" | "reset" | "done" | "invalid";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // トークンがある場合は有効性を確認
  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/operator/auth/password-reset/verify?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) setStep("invalid");
      })
      .catch(() => setStep("invalid"));
  }, [token]);

  // STEP 1: メールアドレス入力
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/v1/operator/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep("sent");
    } catch {
      setError("エラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // STEP 3: 新パスワード設定
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/operator/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "エラーが発生しました");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        {step === "request" && (
          <form onSubmit={handleRequest}>
            <h1 className="login-title">パスワードをお忘れの方へ</h1>
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
              登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
            </p>
            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
            <div className="form-group">
              <label className="form-label">メールアドレス</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "送信中..." : "リセットメールを送信"}
            </button>
            <p style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
              <Link href="/operator/login" style={{ color: "#60a5fa", textDecoration: "none" }}>
                ← ログインに戻る
              </Link>
            </p>
          </form>
        )}

        {step === "sent" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h1 className="login-title">メールをご確認ください</h1>
            <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.7 }}>
              パスワード再設定用のリンクをメールでお送りしました。<br />
              メールが届かない場合は迷惑メールフォルダをご確認ください。
            </p>
            <p style={{ marginTop: 24, fontSize: 13 }}>
              <Link href="/operator/login" style={{ color: "#60a5fa", textDecoration: "none" }}>
                ← ログインに戻る
              </Link>
            </p>
          </div>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset}>
            <h1 className="login-title">新しいパスワードを設定</h1>
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
              8文字以上のパスワードを設定してください。
            </p>
            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
            <div className="form-group">
              <label className="form-label">新しいパスワード</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">新しいパスワード（確認）</label>
              <input
                className="form-input"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "変更中..." : "パスワードを変更する"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 className="login-title">パスワードを変更しました</h1>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              新しいパスワードでログインしてください。
            </p>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={() => router.replace("/operator/login")}
            >
              ログイン画面へ
            </button>
          </div>
        )}

        {step === "invalid" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 className="login-title">リンクが無効です</h1>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              リンクの有効期限が切れているか、すでに使用済みです。<br />
              再度パスワードリセットをお試しください。
            </p>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={() => setStep("request")}
            >
              もう一度試す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
