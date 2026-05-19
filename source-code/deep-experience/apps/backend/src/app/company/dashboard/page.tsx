"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/client-auth";

export default function OperatorDashboardPage() {
  const { loading, authFetch } = useAuth("operator");

  useEffect(() => {
    // 認証確認のみ（将来のAPIコール用のサンプル）
  }, [authFetch]);

  if (loading) return <div className="page-loading">読み込み中...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          color: "#6b7280",
          fontSize: 15,
        }}
      >
        ダッシュボードは今後実装予定です
      </div>
    </div>
  );
}
