"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── Global styles ── */
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -500px 0; }
      100% { background-position: 500px 0; }
    }
    @keyframes dotPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%       { transform: scale(1.7); opacity: 0.4; }
    }

    .pc { animation: fadeUp 0.3s ease both; }
    .pc:nth-child(1) { animation-delay: 0.04s; }
    .pc:nth-child(2) { animation-delay: 0.08s; }
    .pc:nth-child(3) { animation-delay: 0.12s; }
    .pc:nth-child(4) { animation-delay: 0.16s; }
    .pc:nth-child(5) { animation-delay: 0.20s; }
    .pc:nth-child(6) { animation-delay: 0.24s; }

    .pc .c-arrow { opacity: 0.35; transition: transform 0.18s, opacity 0.18s; }
    .pc:hover .c-arrow { transform: translateX(3px); opacity: 1; }
    .live-dot { animation: dotPulse 2s ease-in-out infinite; }
  `}</style>
);

/* ── API ── */
const fetchPlatforms = async (id) => {
  const res = await fetch(`/api/integrationWorkspace/platformsBySource?sourceId=${id}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      loggedInUserId: "1",
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.data;
};

/* ── Palettes ── */
const PALETTES = [
  { accent: "#6b9fd4", light: "#f4f8fd", dark: "#3a6ea8" },
  { accent: "#5aab8e", light: "#f2faf7", dark: "#2e7d62" },
  { accent: "#c9a84c", light: "#fdf9ef", dark: "#8f6d1e" },
  { accent: "#8f7ec7", light: "#f6f4fc", dark: "#5b4a9b" },
  { accent: "#c47fa0", light: "#fdf3f8", dark: "#8e3d66" },
  { accent: "#4fa8bb", light: "#f0f9fc", dark: "#25718a" },
  { accent: "#b87d5b", light: "#fdf6f1", dark: "#7a4a2a" },
  { accent: "#7a8fc7", light: "#f3f5fc", dark: "#3a52a0" },
];
const getPalette = (i) => PALETTES[i % PALETTES.length];

/* ── Status config ── */
const STATUS = {
  Connected: { label: "Connected", dot: "#5aab8e", text: "#2e6b50", bg: "#f2faf7", border: "#c6e9dc" },
  Degraded: { label: "Degraded", dot: "#c9a84c", text: "#7a5e1a", bg: "#fdf9ef", border: "#edd9a3" },
  Offline: { label: "Offline", dot: "#c47474", text: "#8b3535", bg: "#fdf4f4", border: "#e8c0c0" },
};
const getStatus = (s) => STATUS[s] || STATUS.Offline;

/* ── Skeleton ── */
function SkeletonCard() {
  const s = {
    background: "linear-gradient(90deg, #e8ecf4 25%, #f4f6fb 50%, #e8ecf4 75%)",
    backgroundSize: "500px 100%",
    animation: "shimmer 1.4s ease-in-out infinite",
    borderRadius: 6,
  };
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8ecf4", borderRadius: 12,
      padding: "16px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ ...s, width: 40, height: 40, borderRadius: 10 }} />
        <div style={{ ...s, width: 76, height: 22, borderRadius: 20 }} />
      </div>
      <div style={{ ...s, width: "60%", height: 14 }} />
      <div style={{ ...s, width: "40%", height: 11 }} />
      <div style={{ ...s, width: "100%", height: 32, borderRadius: 8 }} />
    </div>
  );
}

/* ── Error state ── */
function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      gridColumn: "1/-1", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "48px 24px", gap: 12, textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", background: "#fef2f2",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, border: "1.5px solid #fecaca",
      }}>⚠️</div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Failed to load</p>
        <p style={{ fontSize: 12, color: "#94a3b8", maxWidth: 300 }}>{message}</p>
      </div>
      <button onClick={onRetry} style={{
        background: "#0f172a", color: "#fff", border: "none", borderRadius: 8,
        padding: "8px 20px", fontWeight: 600, cursor: "pointer", fontSize: 12,
        fontFamily: "inherit",
      }}>↻ Retry</button>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div style={{
      gridColumn: "1/-1", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "48px 24px", gap: 10, textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, border: "1.5px dashed #cbd5e1",
      }}>🔌</div>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>No platforms found</p>
      <p style={{ fontSize: 12, color: "#94a3b8", maxWidth: 260 }}>
        No platforms are connected to this source yet.
      </p>
    </div>
  );
}

/* ── Summary bar ── */
function SummaryBar({ platforms }) {
  const stats = [
    { label: "Total", value: platforms.length, color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
    { label: "Connected", value: platforms.filter(p => p.Status === "Connected").length, color: "#2e6b50", bg: "#f2faf7", border: "#c6e9dc" },
    { label: "Degraded", value: platforms.filter(p => p.Status === "Degraded").length, color: "#7a5e1a", bg: "#fdf9ef", border: "#edd9a3" },
    { label: "Offline", value: platforms.filter(p => p.Status === "Offline").length, color: "#8b3535", bg: "#fdf4f4", border: "#e8c0c0" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: s.bg, border: `1px solid ${s.border}`,
          borderRadius: 8, padding: "7px 14px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {s.value}
          </span>
          <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Platform card ── */
function PlatformCard({ platform, index, onClick }) {
  const [hov, setHov] = useState(false);
  const pal = getPalette(index);
  const sc = getStatus(platform.Status);

  return (
    <button
      className="pc"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hov ? pal.accent + "50" : "#e8ecf4"}`,
        borderRadius: 12,
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.18s ease",
        boxShadow: hov ? `0 6px 18px ${pal.accent}18` : "0 1px 3px #00000007",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Left accent strip */}
      <div style={{
        position: "absolute", left: 0, top: 12, bottom: 12,
        width: 3, borderRadius: "0 3px 3px 0",
        background: pal.accent,
        opacity: hov ? 0.8 : 0.3,
        transition: "opacity 0.18s",
      }} />

      <div style={{ padding: "16px 16px 14px 20px" }}>
        {/* Icon + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: pal.light,
            border: `1px solid ${pal.accent}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: pal.dark,
            letterSpacing: "-0.3px", flexShrink: 0,
            transition: "transform 0.18s",
            transform: hov ? "scale(1.05)" : "scale(1)",
          }}>
            {platform.Initials || platform.PlatformName?.substring(0, 2).toUpperCase()}
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: sc.bg, border: `1px solid ${sc.border}`,
            borderRadius: 20, padding: "4px 10px",
          }}>
            <span
              className={sc.label === "Connected" ? "live-dot" : ""}
              style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block" }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: sc.text }}>{sc.label}</span>
          </div>
        </div>

        {/* Name + source */}
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.2px", marginBottom: 2 }}>
          {platform.PlatformName}
        </p>
        <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
          {platform.Source} platform
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "#f1f5f9", margin: "12px 0 10px" }} />

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 11, color: pal.dark, fontWeight: 600,
            background: pal.light, border: `1px solid ${pal.accent}25`,
            borderRadius: 20, padding: "3px 10px"
          }}>
            Configure
          </span>
          <span className="c-arrow" style={{ color: pal.accent, display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7.5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── Root ── */
export default function App({ params }) {
  const router = useRouter();
  const { id } = params;
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const raw = await fetchPlatforms(id);
      setPlatforms(raw || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  return (
    <>
      <GlobalStyles />
      <div style={{ background: "hsl(var(--background, 0 0% 97%))", minHeight: "100vh", fontFamily: "inherit", paddingBottom: 48 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 0" }}>

          {/* Header row — back button + title inline */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

              {/* Back button */}
              <button
                onClick={() => router.back()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "transparent",
                  border: "1px solid hsl(var(--border, 220 13% 88%))",
                  color: "hsl(var(--muted-foreground, 220 9% 46%))",
                  fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                  padding: "6px 13px 6px 9px", borderRadius: 8,
                  cursor: "pointer", flexShrink: 0,
                  transition: "background 0.15s, color 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--accent, 220 14% 94%))"; e.currentTarget.style.transform = "translateX(-2px)"; e.currentTarget.style.color = "hsl(var(--foreground, 222 47% 11%))"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.color = "hsl(var(--muted-foreground, 220 9% 46%))"; }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>

              {/* Divider */}
              <div style={{ width: 1, height: 28, background: "hsl(var(--border, 220 13% 88%))", flexShrink: 0 }} />

              {/* Title block */}
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.4px", margin: 0, lineHeight: 1.2 }}>
                  Platform Connections
                </h1>
              </div>
            </div>
            <button style={{
              background: "#0f172a", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", fontWeight: 600, cursor: "pointer",
              fontSize: 12.5, fontFamily: "inherit", letterSpacing: "0.1px",
              boxShadow: "0 2px 8px #0f172a25",
            }}>
              + Add Integration
            </button>
          </div>

          {/* Summary bar */}
          {!loading && !error && platforms.length > 0 && (
            <SummaryBar platforms={platforms} />
          )}

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}>
            {loading ? (
              [0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : platforms.length === 0 ? (
              <EmptyState />
            ) : (
              platforms.map((p, i) => (
                <PlatformCard
                  key={p.PlatformId}
                  platform={p}
                  index={i}
                  onClick={() => router.push(`/dashboard/integrationWorkspace/Addworkspace?platformId=${p.PlatformId}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}