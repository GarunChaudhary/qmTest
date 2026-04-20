"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --accent: #2563eb; --accent-light: #eff6ff; --accent-mid: #bfdbfe;
    --border: #e2e8f0; --border-focus: #93c5fd;
    --text-primary: #0f172a; --text-secondary: #64748b; --text-label: #475569;
    --bg-page: #f8fafc; --bg-card: #ffffff;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(37,99,235,0.06);
    --radius: 12px; --radius-sm: 8px; --radius-input: 8px;
  }

  body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-page); color: var(--text-primary); min-height: 100vh; }

  .page-wrap { min-height: 100vh; background: var(--bg-page); padding: 18px 20px 32px; display: flex; flex-direction: column; align-items: center; }

  /* ── Header ── */
  .page-header { width: 100%; max-width: 900px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px;
    background: #fff; border: 1.5px solid var(--border);
    border-radius: 40px; color: var(--accent);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    box-shadow: 0 1px 4px rgba(37,99,235,0.08);
  }
  .back-btn:hover { background: var(--accent-light); border-color: var(--accent); transform: translateX(-2px); }

  .page-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; line-height: 1.2; }
  .page-desc  { font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.5; }

  /* ── Loading skeleton ── */
  .skeleton-wrap { width: 100%; max-width: 900px; }
  .skeleton-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; margin-bottom: 12px; }
  .skeleton-bar { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* ── Card ── */
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); width: 100%; max-width: 900px; overflow: hidden; }

  /* ── Section ── */
  .section { padding: 16px 22px; border-bottom: 1px solid var(--border); animation: fadeUp 0.35s ease both; }
  .section:last-child { border-bottom: none; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .section:nth-child(1) { animation-delay: 0.04s; }
  .section:nth-child(2) { animation-delay: 0.08s; }
  .section:nth-child(3) { animation-delay: 0.12s; }
  .section:nth-child(4) { animation-delay: 0.16s; }
  .section:nth-child(5) { animation-delay: 0.20s; }

  .section-header { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
  .section-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
  .icon-blue    { background: #eff6ff; }
  .icon-violet  { background: #f5f3ff; }
  .icon-emerald { background: #ecfdf5; }
  .icon-amber   { background: #fffbeb; }
  .section-title    { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
  .section-subtitle { font-size: 11px; color: var(--text-secondary); margin-top: 1px; }

  /* ── Grid ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .col-span-2 { grid-column: span 2; }
  @media (max-width: 600px) {
    .grid-2 { grid-template-columns: 1fr; }
    .col-span-2 { grid-column: span 1; }
    .section { padding: 14px 16px; }
    .page-title { font-size: 17px; }
  }

  /* ── Field ── */
  .field { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-size: 11px; font-weight: 600; color: var(--text-label); letter-spacing: 0.03em; display: flex; align-items: center; gap: 4px; }
  .required { color: #ef4444; font-size: 12px; line-height: 1; }
  .input-wrap { position: relative; display: flex; align-items: center; }
  .input-icon { position: absolute; left: 10px; font-size: 13px; color: #94a3b8; pointer-events: none; z-index: 1; }

  input[type="text"], input[type="password"] {
    width: 100%; background: #fafbfd; border: 1.5px solid var(--border);
    border-radius: var(--radius-input); color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px;
    padding: 8px 12px 8px 34px; outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  input[type="text"]:focus, input[type="password"]:focus {
    border-color: var(--border-focus); background: var(--bg-card);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
  }
  input::placeholder { color: #cbd5e1; font-size: 11px; }

  .toggle-btn { position: absolute; right: 9px; background: none; border: none; cursor: pointer; color: #94a3b8; padding: 3px; border-radius: 5px; display: flex; align-items: center; transition: color 0.2s, background 0.2s; }
  .toggle-btn:hover { color: var(--accent); background: var(--accent-light); }

  select.select-input {
    width: 100%; background: #fafbfd; border: 1.5px solid var(--border);
    border-radius: var(--radius-input); color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px;
    padding: 8px 34px 8px 34px; outline: none; cursor: pointer; appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 11px center; background-size: 13px;
  }
  select.select-input:focus { border-color: var(--border-focus); background-color: var(--bg-card); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

  .error-msg { color: #ef4444; font-size: 10.5px; margin-top: 1px; }

  /* ── Footer ── */
  .footer { width: 100%; max-width: 900px; margin-top: 14px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; animation: fadeUp 0.35s 0.22s ease both; }

  .btn-ghost { padding: 9px 18px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s; }
  .btn-ghost:hover { border-color: var(--accent-mid); color: var(--accent); background: var(--accent-light); }

  .btn-primary { padding: 9px 22px; background: var(--accent); border: none; border-radius: var(--radius-sm); color: white; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; box-shadow: 0 3px 12px rgba(37,99,235,0.28); display: flex; align-items: center; gap: 6px; }
  .btn-primary:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,0.38); }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Toast ── */
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px); background: #0f172a; color: #f8fafc; padding: 10px 22px; border-radius: 40px; font-size: 12px; font-weight: 500; box-shadow: 0 10px 28px rgba(0,0,0,0.18); transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); z-index: 999; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast-check { color: #4ade80; font-size: 14px; }
  .spin-loader { width: 13px; height: 13px; border: 2px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.7s linear infinite; }
`;

const EyeIcon = ({ open }) => open
  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;

export default function EditConfigurationPage({ params }) {
  const { id } = params; // appid from URL: /edit-configuration/[id]
  const router = useRouter();

  const [form, setForm] = useState({
    orgId: "", intervalInMinute: "", tokenUrl: "", clientId: "",
    clientSecret: "", redirectUri: "", baseUrl: "", token: "",
    tokenExpiresInSeconds: "", refreshToken: "", refreshTokenExpiresInSec: "",
    timezone: "", destDirectory: "", fileFormat: "", folderStructure: "",
    workspaceid: "", appid: id,
  });

  const [pageLoading, setPageLoading] = useState(true);  // fetching existing record
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timezonesList, setTimezonesList] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);
  const [timezonesError, setTimezonesError] = useState(false);
  const [errors, setErrors] = useState({});

  // ── 1. Fetch existing record by appid ─────────────────────────────────────
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setPageLoading(true);
        // 👇 Replace this with your actual GET procedure/API endpoint
        const res = await fetch(`/api/workspace/configuration/${id}`, {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        });
        const json = await res.json();

        if (res.ok && json.success) {
          const r = json.data; // adjust to match your API response shape
          setForm({
            appid: r.appid ?? id,
            workspaceid: r.workspaceid ?? "",
            orgId: r.org_id ?? "",
            intervalInMinute: String(r.intervalInMinute ?? ""),
            tokenUrl: r.Tokenurl ?? "",
            clientId: r.clientId ?? "",
            clientSecret: r.ClientSecret ?? "",
            redirectUri: r.Redirect_URI ?? "",
            baseUrl: r.BaseUrl ?? "",
            token: r.token ?? "",
            tokenExpiresInSeconds: String(r.TokenExpiresInSeconds ?? ""),
            refreshToken: r.refresh_token ?? "",
            refreshTokenExpiresInSec: String(r.refresh_token_expiresInSec ?? ""),
            timezone: r.timezone ?? "",
            destDirectory: r.Destdirectory ?? "",
            fileFormat: r.FileFormat ?? "",
            folderStructure: r.FolderStrtucture ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load record:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  // ── 2. Fetch timezones ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/timezone", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          cache: "no-store",
        });
        const result = await res.json();
        if (res.ok && result.success && result.data.length > 0) {
          setTimezonesList(result.data);
        } else { setTimezonesError(true); }
      } catch { setTimezonesError(true); }
      finally { setTimezonesLoading(false); }
    })();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((p) => ({ ...p, [key]: value.trim() === "" ? "This field is required" : "" }));
  };

  const handleNumeric = (key) => (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((p) => ({ ...p, [key]: value === "" ? "This field is required" : "" }));
    }
  };

  const handleTimezoneChange = (e) => {
    const selected = e.target.value;
    setForm((f) => ({ ...f, timezone: selected }));
    setErrors((p) => ({ ...p, timezone: selected === "" ? "This field is required" : "" }));
    try {
      const enc = CryptoJS.AES.encrypt(JSON.stringify(selected), "").toString();
      sessionStorage.setItem("selectedTimezone", enc);
    } catch (err) {
      console.error("Encryption failed:", err);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    ["orgId", "intervalInMinute", "tokenUrl", "baseUrl", "redirectUri", "clientId", "clientSecret",
      "token", "tokenExpiresInSeconds", "refreshToken", "refreshTokenExpiresInSec",
      "timezone", "fileFormat", "destDirectory", "folderStructure"].forEach((field) => {
        if (!form[field] || !form[field].toString().trim()) newErrors[field] = "This field is required";
      });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) { alert("Please fill all required fields."); return; }
    try {
      setSaving(true);
      // 👇 Replace with your actual UPDATE procedure/API endpoint
      const response = await fetch("/api/workspace/appsettings", {
        method: "POST",   // change to PUT/PATCH if your API requires it
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setToast(true);
        setTimeout(() => { setToast(false); router.back(); }, 2000);
      } else { alert(result.message || "Failed to save"); }
    } catch { alert("Something went wrong while saving."); }
    finally { setSaving(false); }
  };

  const Err = ({ field }) => errors[field]
    ? <span className="error-msg">{errors[field]}</span>
    : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <>
        <style>{styles}</style>
        <div className="page-wrap">
          <div className="page-header">
            <div className="header-left">
              <button className="back-btn" onClick={() => router.back()}>← Back</button>
              <div>
                <div className="page-title">Edit Configuration</div>
                <p className="page-desc">Loading record…</p>
              </div>
            </div>
          </div>
          <div className="skeleton-wrap">
            {[1, 2, 3].map((n) => (
              <div className="skeleton-card" key={n}>
                <div className="skeleton-bar" style={{ height: 14, width: "30%", marginBottom: 14 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[1, 2, 3, 4].map((m) => (
                    <div key={m}>
                      <div className="skeleton-bar" style={{ height: 10, width: "40%", marginBottom: 6 }} />
                      <div className="skeleton-bar" style={{ height: 34 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="page-wrap">

        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => router.back()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              Back
            </button>
            <div>
              <h1 className="page-title">Edit Configuration</h1>
              <p className="page-desc">Update app credentials, OAuth tokens, and system preferences.</p>
            </div>
          </div>
        </div>

        <div className="card">

          {/* Section 1 */}
          <div className="section">
            <div className="section-header">
              <div className="section-icon icon-blue">🏢</div>
              <div><div className="section-title">Application & Organization</div><div className="section-subtitle">Core app identity and fetch settings</div></div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">Org ID <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🏛️</span>
                  <input type="text" placeholder="e.g. org_4f8c2a91b3d7" value={form.orgId} onChange={set("orgId")} />
                </div><Err field="orgId" />
              </div>
              <div className="field">
                <label className="field-label">Interval (minutes) <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">⏱️</span>
                  <input type="text" placeholder="e.g. 30" value={form.intervalInMinute} onChange={handleNumeric("intervalInMinute")} />
                </div><Err field="intervalInMinute" />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="section">
            <div className="section-header">
              <div className="section-icon icon-violet">🔗</div>
              <div><div className="section-title">OAuth Endpoints</div><div className="section-subtitle">Authentication URLs and redirect URIs</div></div>
            </div>
            <div className="grid-2">
              <div className="field col-span-2">
                <label className="field-label">Token URL <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🌍</span>
                  <input type="text" placeholder="https://auth.example.com/oauth/token" value={form.tokenUrl} onChange={set("tokenUrl")} />
                </div><Err field="tokenUrl" />
              </div>
              <div className="field col-span-2">
                <label className="field-label">Base URL <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🏠</span>
                  <input type="text" placeholder="https://api.example.com/v1" value={form.baseUrl} onChange={set("baseUrl")} />
                </div><Err field="baseUrl" />
              </div>
              <div className="field col-span-2">
                <label className="field-label">Redirect URI <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">↩️</span>
                  <input type="text" placeholder="https://yourapp.com/auth/callback" value={form.redirectUri} onChange={set("redirectUri")} />
                </div><Err field="redirectUri" />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="section">
            <div className="section-header">
              <div className="section-icon icon-amber">🛡️</div>
              <div><div className="section-title">Client Credentials</div><div className="section-subtitle">OAuth 2.0 client identity and secret</div></div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">Client ID <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🪪</span>
                  <input type="text" placeholder="client_xxxxxxxxxxxxxxxx" value={form.clientId} onChange={set("clientId")} />
                </div><Err field="clientId" />
              </div>
              <div className="field">
                <label className="field-label">Client Secret <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🔒</span>
                  <input type={showSecret ? "text" : "password"} placeholder="••••••••••••••••" value={form.clientSecret} onChange={set("clientSecret")} style={{ paddingRight: "36px" }} />
                  <button className="toggle-btn" onClick={() => setShowSecret(!showSecret)}><EyeIcon open={showSecret} /></button>
                </div><Err field="clientSecret" />
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="section">
            <div className="section-header">
              <div className="section-icon icon-emerald">⚡</div>
              <div><div className="section-title">Access & Refresh Tokens</div><div className="section-subtitle">Token values and expiry durations</div></div>
            </div>
            <div className="grid-2">
              <div className="field col-span-2">
                <label className="field-label">Token <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🎟️</span>
                  <input type={showToken ? "text" : "password"} placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9…" value={form.token} onChange={set("token")} style={{ paddingRight: "36px" }} />
                  <button className="toggle-btn" onClick={() => setShowToken(!showToken)}><EyeIcon open={showToken} /></button>
                </div><Err field="token" />
              </div>
              <div className="field">
                <label className="field-label">Token Expires In (seconds) <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">⏳</span>
                  <input type="text" placeholder="e.g. 3600" value={form.tokenExpiresInSeconds} onChange={handleNumeric("tokenExpiresInSeconds")} />
                </div><Err field="tokenExpiresInSeconds" />
              </div>
              <div className="field">
                <label className="field-label">Refresh Token Expires In (seconds) <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">⌛</span>
                  <input type="text" placeholder="e.g. 86400" value={form.refreshTokenExpiresInSec} onChange={handleNumeric("refreshTokenExpiresInSec")} />
                </div><Err field="refreshTokenExpiresInSec" />
              </div>
              <div className="field col-span-2">
                <label className="field-label">Refresh Token <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🔄</span>
                  <input type={showRefresh ? "text" : "password"} placeholder="rt_xxxxxxxxxxxxxxxxxxxx" value={form.refreshToken} onChange={set("refreshToken")} style={{ paddingRight: "36px" }} />
                  <button className="toggle-btn" onClick={() => setShowRefresh(!showRefresh)}><EyeIcon open={showRefresh} /></button>
                </div><Err field="refreshToken" />
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="section">
            <div className="section-header">
              <div className="section-icon icon-blue">🗂️</div>
              <div><div className="section-title">Storage & System</div><div className="section-subtitle">File output, folder structure and regional settings</div></div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="field-label">Timezone <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">🌐</span>
                  {timezonesLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px 8px 34px", background: "#fafbfd", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#94a3b8", width: "100%" }}>
                      <div className="spin-loader" /> Loading timezones…
                    </div>
                  ) : timezonesError ? (
                    <select className="select-input" disabled><option>Failed to load timezones</option></select>
                  ) : (
                    <select className="select-input" value={form.timezone} onChange={handleTimezoneChange}>
                      {timezonesList.map((tz) => <option key={tz.TimeZone} value={tz.TimeZone}>{tz.TimeZone}</option>)}
                    </select>
                  )}
                </div><Err field="timezone" />
              </div>
              <div className="field">
                <label className="field-label">File Format <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">📄</span>
                  <select className="select-input" value={form.fileFormat} onChange={set("fileFormat")}>
                    <option value="">Select format…</option>
                    <option>Mp3</option><option>Wav</option><option>Mp4</option>
                  </select>
                </div><Err field="fileFormat" />
              </div>
              <div className="field col-span-2">
                <label className="field-label">Destination Directory <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">📁</span>
                  <input type="text" placeholder="e.g. /data/output/recordings" value={form.destDirectory} onChange={set("destDirectory")} />
                </div><Err field="destDirectory" />
              </div>
              <div className="field col-span-2">
                <label className="field-label">Folder Structure <span className="required">*</span></label>
                <div className="input-wrap"><span className="input-icon">🗃️</span>
                  <input type="text" placeholder="e.g. {year}/{month}/{day}/{orgId}" value={form.folderStructure} onChange={set("folderStructure")} />
                </div><Err field="folderStructure" />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="footer">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spin-loader" style={{ borderTopColor: "white" }} /> Saving…</> : "💾 Save Changes"}
          </button>
        </div>

      </div>

      <div className={`toast ${toast ? "show" : ""}`}>
        <span className="toast-check">✓</span>
        Configuration updated successfully!
      </div>
    </>
  );
}