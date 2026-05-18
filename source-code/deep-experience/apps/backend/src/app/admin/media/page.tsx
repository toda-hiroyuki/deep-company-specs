"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/client-auth";
import { useI18n } from "@/lib/i18n";

interface MediaItem {
  id: string;
  filename: string;
  originalUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
  tourCount: number;
  spotCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MediaDetail {
  id: string;
  filename: string;
  originalUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
  linkedTours: { tourId: string; title: string; titleEn: string; sortOrder: number }[];
  linkedSpots: { spotId: string; name: string; sortOrder: number }[];
}

export default function AdminMediaPage() {
  const { authFetch, loading: authLoading } = useAuth("admin");
  const { t } = useI18n();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const data = await authFetch(`/admin/media?page=${page}&limit=24&search=${encodeURIComponent(search)}`);
      setMedia(data.media);
      setPagination(data.pagination);
    } catch (e) {
      console.error("Failed to fetch media", e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, search]);

  useEffect(() => {
    if (!authLoading) fetchMedia();
  }, [authLoading, fetchMedia]);

  async function handleUpload(files: FileList | File[]) {
    setUploading(true);
    try {
      const token = localStorage.getItem("admin_token");
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/admin/media/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error?.message || "Upload failed");
        }
      }
      await fetchMedia();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("media.deleteConfirm"))) return;
    try {
      await authFetch(`/admin/media/${id}`, { method: "DELETE" });
      await fetchMedia();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const data = await authFetch(`/admin/media/${id}`);
      setSelectedMedia(data);
    } catch (e) {
      console.error("Failed to fetch media detail", e);
    } finally {
      setDetailLoading(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (authLoading || loading) return <div className="page-loading">{t("common.loading")}</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t("media.title")}</h1>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {pagination ? `${pagination.total} files` : ""}
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#eff6ff" : "#fafafa",
          marginBottom: 20,
          transition: "all 0.2s",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          {uploading ? t("media.uploading") : dragOver ? t("media.dropzoneActive") : t("media.dropzone")}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Grid */}
      {media.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>{t("media.empty")}</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}>
          {media.map((m) => {
            const linkCount = m.tourCount + m.spotCount;
            return (
              <div key={m.id} onClick={() => openDetail(m.id)} style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
                cursor: "pointer",
                transition: "box-shadow 0.15s",
              }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"}
                 onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ position: "relative" }}>
                  <img
                    src={m.thumbnailUrl}
                    alt={m.alt || m.filename}
                    style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                  />
                  {linkCount === 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(239,68,68,0.9)", color: "#fff",
                        border: "none", borderRadius: "50%",
                        width: 24, height: 24, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, lineHeight: 1,
                      }}
                      title={t("common.delete")}
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <p style={{
                    fontSize: 12, fontWeight: 500, color: "#374151",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {m.filename}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {formatSize(m.sizeBytes)}
                    {m.width && m.height ? ` / ${m.width}x${m.height}` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {m.tourCount > 0 && (
                      <span style={{
                        fontSize: 10, background: "#dbeafe", color: "#1e40af",
                        padding: "1px 6px", borderRadius: 8,
                      }}>
                        {t("media.linkedTours", { count: m.tourCount })}
                      </span>
                    )}
                    {m.spotCount > 0 && (
                      <span style={{
                        fontSize: 10, background: "#dcfce7", color: "#166534",
                        padding: "1px 6px", borderRadius: 8,
                      }}>
                        {t("media.linkedSpots", { count: m.spotCount })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            &laquo;
          </button>
          <span style={{ padding: "6px 12px", fontSize: 13 }}>
            {page} / {pagination.totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            &raquo;
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {(selectedMedia || detailLoading) && (
        <div
          onClick={() => { if (!detailLoading) setSelectedMedia(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, maxWidth: 720, width: "90%",
              maxHeight: "90vh", overflow: "auto", position: "relative",
            }}
          >
            {detailLoading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
                {t("common.loading")}
              </div>
            ) : selectedMedia && (
              <>
                {/* Close button */}
                <button
                  onClick={() => setSelectedMedia(null)}
                  style={{
                    position: "absolute", top: 12, right: 12,
                    background: "rgba(0,0,0,0.5)", color: "#fff",
                    border: "none", borderRadius: "50%",
                    width: 32, height: 32, cursor: "pointer",
                    fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  &times;
                </button>

                {/* Large image */}
                <img
                  src={selectedMedia.originalUrl}
                  alt={selectedMedia.alt || selectedMedia.filename}
                  style={{
                    width: "100%", maxHeight: 400, objectFit: "contain",
                    background: "#f3f4f6", display: "block",
                    borderRadius: "12px 12px 0 0",
                  }}
                />

                {/* Info */}
                <div style={{ padding: "16px 20px" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
                    {selectedMedia.filename}
                  </h3>

                  <div style={{
                    display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px",
                    fontSize: 13, color: "#374151", marginBottom: 16,
                  }}>
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>{t("media.createdAt")}</span>
                    <span>{formatDate(selectedMedia.createdAt)}</span>

                    {selectedMedia.width && selectedMedia.height && (
                      <>
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>{t("media.dimensions")}</span>
                        <span>{selectedMedia.width} x {selectedMedia.height}</span>
                      </>
                    )}

                    <span style={{ color: "#6b7280", fontWeight: 500 }}>{t("media.fileSize")}</span>
                    <span>{formatSize(selectedMedia.sizeBytes)}</span>
                  </div>

                  {/* Linked Tours */}
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      {t("media.linkedToursLabel")}
                    </h4>
                    {selectedMedia.linkedTours.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>{t("media.noLinks")}</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {selectedMedia.linkedTours.map((lt) => (
                          <a
                            key={lt.tourId}
                            href={`/admin/tours/${lt.tourId}`}
                            style={{
                              fontSize: 13, color: "#2563eb", textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >
                            <span style={{
                              display: "inline-block", width: 6, height: 6,
                              borderRadius: "50%", background: "#3b82f6", flexShrink: 0,
                            }} />
                            {lt.titleEn || lt.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Linked Spots */}
                  {selectedMedia.linkedSpots.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                        {t("media.linkedSpotsLabel")}
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {selectedMedia.linkedSpots.map((ls) => (
                          <a
                            key={ls.spotId}
                            href={`/admin/spots/${ls.spotId}`}
                            style={{
                              fontSize: 13, color: "#16a34a", textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >
                            <span style={{
                              display: "inline-block", width: 6, height: 6,
                              borderRadius: "50%", background: "#22c55e", flexShrink: 0,
                            }} />
                            {ls.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
