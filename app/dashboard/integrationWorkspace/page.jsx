"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";

const defaultConfig = {
  icon: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 7v4M11 14v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  accent: "#7c3aed",
  bg: "rgba(124,58,237,0.06)",
  border: "rgba(124,58,237,0.15)",
  description: "Configure and manage this platform integration.",
};

const pageStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .iw-page {
    min-height: 100vh;
    padding: 24px 28px 48px;
    background: hsl(var(--background, 0 0% 98%));
    font-family: inherit;
  }

  .iw-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid hsl(var(--border, 220 13% 88%));
    color: hsl(var(--muted-foreground, 220 9% 46%));
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    padding: 6px 14px 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
    margin-bottom: 20px;
  }
  .iw-back-btn:hover {
    background: hsl(var(--accent, 220 14% 94%));
    border-color: hsl(var(--border, 220 13% 82%));
    color: hsl(var(--foreground, 222 47% 11%));
    transform: translateX(-2px);
  }

  .iw-header {
    margin-bottom: 20px;
    animation: fadeUp 0.35s ease both;
  }
  .iw-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7c3aed;
    margin-bottom: 6px;
  }
  .iw-eyebrow-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #7c3aed;
  }
  .iw-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 5px;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: hsl(var(--foreground, 222 47% 11%));
  }
  .iw-subtitle {
    font-size: 13px;
    color: hsl(var(--muted-foreground, 220 9% 46%));
    margin: 0;
    line-height: 1.5;
  }

  .iw-divider {
    height: 1px;
    background: hsl(var(--border, 220 13% 91%));
    border: none;
    margin-bottom: 20px;
  }

  .iw-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }

  .iw-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 18px 16px 14px;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    border: 1px solid rgba(124,58,237,0.14);
    background: rgba(124,58,237,0.04);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    outline: none;
    width: 100%;
    animation: fadeUp 0.35s ease both;
  }
  .iw-card:hover {
    transform: translateY(-3px);
    border-color: rgba(124,58,237,0.35);
    background: rgba(124,58,237,0.08);
    box-shadow: 0 8px 24px rgba(124,58,237,0.1);
  }

  .iw-card-num {
    position: absolute;
    top: 12px; right: 14px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: hsl(var(--muted-foreground, 220 9% 70%));
    opacity: 0.5;
  }

  .iw-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px; height: 40px;
    border-radius: 10px;
    background: rgba(124,58,237,0.08);
    border: 1px solid rgba(124,58,237,0.12);
    color: #7c3aed;
    transition: background 0.18s;
  }
  .iw-card:hover .iw-icon-wrap {
    background: rgba(124,58,237,0.15);
  }

  .iw-card-label {
    font-size: 14px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.01em;
    color: hsl(var(--foreground, 222 47% 11%));
  }

  .iw-card-desc {
    font-size: 12px;
    color: hsl(var(--muted-foreground, 220 9% 50%));
    margin: 0;
    line-height: 1.55;
    flex-grow: 1;
  }

  .iw-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 2px;
  }
  .iw-card-tag {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 100px;
    background: rgba(124,58,237,0.08);
    color: #7c3aed;
    border: 1px solid rgba(124,58,237,0.15);
  }
  .iw-card-arrow {
    color: hsl(var(--muted-foreground, 220 9% 65%));
    display: flex;
    transition: color 0.18s, transform 0.18s;
  }
  .iw-card:hover .iw-card-arrow {
    color: #7c3aed;
    transform: translateX(3px);
  }

  .iw-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 48px 0;
  }
  .iw-spinner {
    width: 26px; height: 26px;
    border: 2.5px solid hsl(var(--border, 220 13% 88%));
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  .iw-state-text {
    font-size: 13px;
    color: hsl(var(--muted-foreground, 220 9% 50%));
    margin: 0;
  }
  .iw-error-box {
    padding: 14px 18px;
    border-radius: 10px;
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.18);
    max-width: 420px;
  }
  .iw-error-text {
    font-size: 13px;
    color: #dc2626;
    margin: 0;
  }
  .iw-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 0;
    color: hsl(var(--muted-foreground, 220 9% 60%));
    font-size: 13px;
  }
`;

export default function IntegrationWorkspacePage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN;
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const res = await fetch("/api/integrationWorkspace", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            loggedInUserId: userId || "",
          },
        });

        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || "Failed to fetch sources.");
        setPlatforms(result.data);
      } catch (err) {
        console.error("Error fetching sources:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  return (
    <>
      <style>{pageStyles}</style>
      <div className="iw-page">

        {/* <button className="iw-back-btn" onClick={() => router.back()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button> */}

        <div className="iw-header">
          <h1 className="iw-title">Choose a Workspace</h1>
          <p className="iw-subtitle">Select a platform to configure your integration.</p>
        </div>

        <hr className="iw-divider" />

        {loading && (
          <div className="iw-state">
            <div className="iw-spinner" />
            <p className="iw-state-text">Loading platforms…</p>
          </div>
        )}

        {!loading && error && (
          <div className="iw-error-box">
            <p className="iw-error-text">⚠ {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="iw-grid">
            {platforms.length === 0 ? (
              <div className="iw-empty">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11 16h10M16 11v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                No platforms available yet.
              </div>
            ) : (
              platforms.map((item, idx) => (
                <PlatformCard
                  key={item.id}
                  index={idx}
                  platform={{ id: item.id, label: item.source, ...defaultConfig }}
                  onClick={() => router.push(`/dashboard/integrationWorkspace/${item.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PlatformCard({ platform, onClick, index }) {
  return (
    <button
      className="iw-card"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onClick}
    >
      <span className="iw-card-num">{String(index + 1).padStart(2, "0")}</span>
      <div className="iw-icon-wrap">{platform.icon}</div>
      <h2 className="iw-card-label">{platform.label}</h2>
      <p className="iw-card-desc">{platform.description}</p>
      <div className="iw-card-footer">
        <span className="iw-card-tag">Connect</span>
        <span className="iw-card-arrow">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5h9M8.5 4l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </button>
  );
}