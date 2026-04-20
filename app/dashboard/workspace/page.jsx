"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function truncate(val, len = 18) {
  const str = String(val ?? "");
  if (!str || str === "NULL") return "—";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #eef2f2; }

  .tbl-page { padding: 20px; background: #eef2f2; min-height: 100vh; font-family: sans-serif; }
  .tbl-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
  .tbl-search-wrap { position: relative; }
  .tbl-search { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 32px 7px 10px; font-size: 12px; outline: none; width: 210px; background: #fff; color: #333; transition: border-color 0.2s; }
  .tbl-search:focus { border-color: #2563eb; }
  .tbl-search-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #aaa; font-size: 13px; pointer-events: none; }
  .tbl-btn { background: #1a6bb5; color: #fff; border: none; border-radius: 5px; padding: 7px 16px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background 0.2s; display: flex; align-items: center; gap: 5px; }
  .tbl-btn:hover { background: #1558a0; }
  .tbl-btn-ghost { background: #fff; color: #1a6bb5; border: 1px solid #1a6bb5; border-radius: 5px; padding: 7px 16px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
  .tbl-btn-ghost:hover { background: #eff6ff; }
  .tbl-card { background: #fff; border-radius: 8px; border: 1px solid #dde3e3; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { border-bottom: 2px solid #e8eeee; }
  th { padding: 10px 13px; text-align: left; font-weight: 600; color: #555; white-space: nowrap; background: #fff; font-size: 11.5px; }
  td { padding: 9px 13px; color: #333; white-space: nowrap; border-bottom: 1px solid #eef2f2; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  .edit-icon-btn { background: none; border: none; cursor: pointer; color: #2563eb; font-size: 14px; padding: 3px 6px; border-radius: 5px; transition: background 0.2s; }
  .edit-icon-btn:hover { background: #eff6ff; }
  .empty-cell { text-align: center; padding: 28px; color: #aaa; font-size: 12px; }
  .retry-btn { margin-left: 10px; background: #1a6bb5; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
`;

export default function IntegrationConfigurationPage() {
  const router = useRouter();
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/workspace/configuration");
      const json = await res.json();
      if (res.ok) {
        setColumns((json.columns || []).map((col) => ({ label: col, key: col })));
        setData(json.rows || []);
      } else { setError(json.message || "Failed to load data."); }
    } catch (err) { setError("Network error: " + err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter((row) =>
    Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  // ── Redirects to the separate edit page with appid in the URL ──
  const handleEdit = (row) => {
    console.log('row', row);
    router.push(`/dashboard/workspace/${row.appid}`);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="tbl-page">

        <div className="tbl-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="tbl-search-wrap">
              <input className="tbl-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
              <span className="tbl-search-icon">🔍</span>
            </div>
            <button className="tbl-btn-ghost" onClick={() => setSearch("")}>Reset</button>
          </div>
          <button className="tbl-btn" onClick={() => router.push("/dashboard/workspace/Addworkspace")}>
            ⊕ Add Configuration
          </button>
        </div>

        <div className="tbl-card">
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {columns.map((col) => <th key={col.key}>{col.label} ⇅</th>)}
                  {columns.length > 0 && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-cell" colSpan={columns.length + 1}>Loading…</td></tr>
                ) : error ? (
                  <tr><td className="empty-cell" colSpan={columns.length + 1} style={{ color: "#e55" }}>
                    {error}<button className="retry-btn" onClick={fetchData}>Retry</button>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="empty-cell" colSpan={columns.length + 1}>No records found.</td></tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={i}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f7fafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      {columns.map((col) => <td key={col.key}>{truncate(row[col.key])}</td>)}
                      <td>
                        <button className="edit-icon-btn" onClick={() => handleEdit(row)} title="Edit">✏️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}