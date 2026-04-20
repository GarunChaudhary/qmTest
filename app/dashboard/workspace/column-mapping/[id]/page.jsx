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

  .page-wrap {
    min-height: 100vh;
    background: var(--bg-page);
    padding: 18px 20px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── Header ── */
  .page-header {
    width: 100%;
    max-width: 980px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .page-title {
    font-family: 'Fraunces', serif;
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .page-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 3px;
    line-height: 1.5;
  }

  /* ── Card ── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    width: 100%;
    max-width: 980px;
    overflow: hidden;
  }

  /* ── Table headers ── */
  .mapping-header {
    display: grid;
    grid-template-columns: 1fr 32px 1fr 32px;
    gap: 0;
    padding: 9px 20px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
  }

  .custom-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 32px;
    gap: 8px;
    padding: 9px 20px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
  }

  .col-header {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .section { border-bottom: 1px solid var(--border); }
  .section:last-child { border-bottom: none; }

  /* ── Collapsible toggle bar ── */
  .collapse-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: linear-gradient(to right, #f1f5f9, #f8fafc);
    border: none;
    border-bottom: 1px solid #e9eef5;
    cursor: pointer;
    transition: background 0.18s;
    gap: 10px;
  }
  .collapse-toggle:hover { background: linear-gradient(to right, #e8edf5, #f1f5f9); }

  .collapse-toggle-left {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
  }

  .section-label-pill {
    background: var(--accent-mid);
    color: var(--accent);
    padding: 1px 7px;
    border-radius: 20px;
    font-size: 9.5px;
    font-weight: 700;
  }

  .collapse-toggle-right {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--accent);
  }

  .chevron {
    width: 14px; height: 14px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  /* ── Collapsible body ── */
  .collapse-body { overflow: hidden; transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease; max-height: 0; opacity: 0; }
  .collapse-body.open { max-height: 4000px; opacity: 1; }

  /* ── Rows ── */
  .fixed-row {
    display: grid;
    grid-template-columns: 1fr 32px 1fr 32px;
    padding: 7px 20px;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
    animation: fadeUp 0.3s ease both;
  }
  .fixed-row:last-child { border-bottom: none; }
  .fixed-row:hover { background: #fafbff; }

  .custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 32px;
    gap: 8px;
    padding: 7px 20px;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    transition: background 0.15s;
    animation: fadeUp 0.3s ease both;
  }
  .custom-row:last-child { border-bottom: none; }
  .custom-row:hover { background: #f5f8ff; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }

  /* ── Inputs ── */
  .map-input {
    width: 100%;
    background: #fafbfd;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-input);
    color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    padding: 7px 10px;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .map-input:focus { border-color: var(--border-focus); background: var(--bg-card); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .map-input:read-only { background: #f1f5f9; color: #64748b; cursor: default; border-color: #e9eef5; }
  .map-input::placeholder { color: #cbd5e1; font-size: 11px; }

  .map-select {
    width: 100%;
    background: #fafbfd;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-input);
    color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    padding: 7px 28px 7px 10px;
    outline: none;
    cursor: pointer;
    appearance: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 9px center;
    background-size: 12px;
  }
  .map-select:focus { border-color: var(--border-focus); background-color: var(--bg-card); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .map-select:disabled { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; opacity: 0.7; }

  .select-loading {
    width: 100%;
    background: #f1f5f9;
    border: 1.5px solid #e9eef5;
    border-radius: var(--radius-input);
    padding: 7px 10px;
    font-size: 11.5px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .spin { width: 11px; height: 11px; border: 2px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

  .arrow-cell { display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 13px; }
  .action-cell { display: flex; align-items: center; justify-content: flex-end; }
  .placeholder-cell { width: 24px; }

  .delete-btn {
    width: 24px; height: 24px;
    border-radius: 6px;
    border: 1.5px solid #fecaca;
    background: #fff5f5;
    color: #ef4444;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 11px;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    flex-shrink: 0;
  }
  .delete-btn:hover { background: #fee2e2; border-color: #ef4444; transform: scale(1.07); }

  /* ── Add row ── */
  .add-row-wrap {
    padding: 10px 20px;
    border-top: 1px dashed #e2e8f0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .add-custom-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: var(--accent-light);
    border: 1.5px dashed var(--accent-mid);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .add-custom-btn:hover:not(:disabled) { background: #dbeafe; border-color: var(--accent); transform: translateY(-1px); }
  .add-custom-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .custom-count { font-size: 11px; color: var(--text-secondary); }
  .custom-count span { font-weight: 700; color: var(--accent); }

  .empty-custom { padding: 16px 20px; color: #94a3b8; font-size: 11.5px; text-align: center; }

  /* ── Footer ── */
  .footer {
    width: 100%;
    max-width: 980px;
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    animation: fadeUp 0.35s 0.18s ease both;
  }

  .btn-ghost {
    padding: 9px 18px;
    background: var(--bg-card);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }
  .btn-ghost:hover { border-color: var(--accent-mid); color: var(--accent); background: var(--accent-light); }

  .btn-primary {
    padding: 9px 22px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 3px 12px rgba(37,99,235,0.28);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,0.38); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 22px;
    border-radius: 40px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 10px 28px rgba(0,0,0,0.18);
    transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast-check { color: #4ade80; font-size: 13px; }

  @media (max-width: 680px) {
    .fixed-row, .custom-row, .mapping-header, .custom-header { padding: 7px 12px; }
    .custom-row { grid-template-columns: 1fr; }
    .custom-header { display: none; }
    .add-row-wrap { padding: 10px 12px; }
    .collapse-toggle { padding: 10px 12px; }
  }
`;

const MAX_CUSTOM = 25;

const ChevronIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function ColumnMappingPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [DestinationColumns, setDestinationColumns] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [fixedColumns, setFixedColumns] = useState([]);
  const [colsLoading, setColsLoading] = useState(false);
  const [colsError, setColsError] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(true);

  useEffect(() => {
    async function loadColumns() {
      setColsLoading(true);
      try {
        const response = await fetch("/api/workspace/SystemColDLL");
        const data = await response.json();
        if (response.ok) {
          setDynamicColumns(data.customFieldList || []);
          setFixedColumns(data.fixedColumns || []);
        } else { console.error("Failed to fetch columns:", data.message); }
      } catch (error) { console.error(error); setColsError(true); }
      finally { setColsLoading(false); }
    }
    loadColumns();
  }, []);

  useEffect(() => {
    async function loaddestColumns() {
      setColsLoading(true);
      try {
        const response = await fetch("/api/workspace/DestcolDLL", {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        });
        const data = await response.json();
        if (response.ok) { setDestinationColumns(data.destFieldList); }
        else { console.error("Failed to fetch Custom Fields:", data.message); }
      } catch { setColsError(true); }
      finally { setColsLoading(false); }
    }
    loaddestColumns();
  }, []);

  const addCustomColumn = () => {
    if (customColumns.length >= MAX_CUSTOM) return;
    const n = customColumns.length + 1;
    setCustomColumns((prev) => [...prev, { id: Date.now(), displayName: `Custom Column ${n}`, srcColumn: "", destColumn: "" }]);
  };

  const removeCustomColumn = (id) => setCustomColumns((prev) => prev.filter((c) => c.id !== id));
  const updateCol = (id, field, value) => setCustomColumns((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const handleSave = async () => {
    try {
      setSaving(true);
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }
      const fixedData = fixedColumns.map((col) => ({ systemColumn: col.display_name, sourceColumn: col.column_name, displayName: col.display_name }));
      const customData = customColumns.map((col) => ({ systemColumn: col.srcColumn, sourceColumn: col.destColumn, displayName: col.displayName }));
      const payload = { workspaceId: id, mappings: [...fixedData, ...customData], created_by: userId };
      const response = await fetch("/api/workspace/saveColumnMapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setToast(true);
      router.push(`/dashboard/organization?workspaceid=${id}`);
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const ColDropdown = ({ value, onChange, options = [] }) => {
    if (colsLoading) return <div className="select-loading"><div className="spin" /> Loading…</div>;
    if (colsError) return <select className="map-select" disabled><option>Failed to load</option></select>;
    return (
      <select className="map-select" value={value || ""} onChange={onChange} disabled={options.length === 0}>
        <option value="">{options.length === 0 ? "— No columns —" : "— Select —"}</option>
        {options.map((col, i) => <option key={i} value={col.name}>{col.name}</option>)}
      </select>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="page-wrap">

        <div className="page-header">
          <div>
            <h1 className="page-title">Column Mapping</h1>
            <p className="page-desc">Map source columns to destination columns. Add up to {MAX_CUSTOM} custom columns with a display name.</p>
          </div>
        </div>

        <div className="card">

          {/* Fixed Columns */}
          <div className="section">
            <button className="collapse-toggle" onClick={() => setFixedOpen((v) => !v)} type="button">
              <div className="collapse-toggle-left">
                <span>🔒</span>
                Fixed Columns
                <span className="section-label-pill">{fixedColumns.length} columns</span>
              </div>
              <div className="collapse-toggle-right">
                <span>{fixedOpen ? "Hide" : "Show"}</span>
                <span className={`chevron ${fixedOpen ? "open" : ""}`}><ChevronIcon /></span>
              </div>
            </button>

            <div className={`collapse-body ${fixedOpen ? "open" : ""}`}>
              <div className="mapping-header">
                <div className="col-header">📥 Source Column</div>
                <div />
                <div className="col-header">📤 Destination Column</div>
                <div />
              </div>

              {fixedColumns.length === 0 && !colsLoading && (
                <div style={{ padding: "14px 20px", color: "#94a3b8", fontSize: "11.5px", textAlign: "center" }}>No fixed columns loaded yet.</div>
              )}

              {fixedColumns.map((col, i) => (
                <div className="fixed-row" key={i} style={{ animationDelay: `${0.02 * i}s` }}>
                  <input className="map-input" value={col.display_name} readOnly />
                  <div className="arrow-cell">→</div>
                  <input className="map-input" value={col.display_name} readOnly />
                  <div className="action-cell"><div className="placeholder-cell" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Columns */}
          <div className="section">
            <button className="collapse-toggle" onClick={() => setCustomOpen((v) => !v)} type="button">
              <div className="collapse-toggle-left">
                <span>✏️</span>
                Custom Columns
                <span className="section-label-pill">{customColumns.length} / {MAX_CUSTOM}</span>
              </div>
              <div className="collapse-toggle-right">
                <span>{customOpen ? "Hide" : "Show"}</span>
                <span className={`chevron ${customOpen ? "open" : ""}`}><ChevronIcon /></span>
              </div>
            </button>

            <div className={`collapse-body ${customOpen ? "open" : ""}`}>
              <div className="custom-header">
                <div className="col-header">📥 System Column</div>
                <div className="col-header">📤 Source Column</div>
                <div className="col-header">🏷️ Display Name</div>
                <div />
              </div>

              {customColumns.length === 0 && (
                <div className="empty-custom">No custom columns yet. Click Add Custom Column to get started.</div>
              )}

              {customColumns.map((col, i) => (
                <div className="custom-row" key={col.id} style={{ animationDelay: `${0.03 * i}s` }}>
                  <ColDropdown options={dynamicColumns || []} value={col.srcColumn} onChange={(e) => updateCol(col.id, "srcColumn", e.target.value)} />
                  <ColDropdown options={DestinationColumns || []} value={col.destColumn} onChange={(e) => updateCol(col.id, "destColumn", e.target.value)} />
                  <input className="map-input" value={col.displayName} placeholder="e.g. My Custom Field" onChange={(e) => updateCol(col.id, "displayName", e.target.value)} />
                  <div className="action-cell">
                    <button className="delete-btn" onClick={() => removeCustomColumn(col.id)} title="Remove">✕</button>
                  </div>
                </div>
              ))}

              <div className="add-row-wrap">
                <button className="add-custom-btn" onClick={addCustomColumn} disabled={customColumns.length >= MAX_CUSTOM}>
                  <span style={{ fontSize: "15px", lineHeight: 1 }}>+</span> Add Custom Column
                </button>
                {customColumns.length > 0 && (
                  <span className="custom-count"><span>{MAX_CUSTOM - customColumns.length}</span> slots remaining</span>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="footer">
          <button className="btn-ghost" onClick={() => router.back()}>← Back</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "⏳ Saving…" : "💾 Save Mapping"}
          </button>
        </div>

      </div>

      <div className={`toast ${toast ? "show" : ""}`}>
        <span className="toast-check">✓</span>
        Column mapping saved successfully!
      </div>
    </>
  );
}