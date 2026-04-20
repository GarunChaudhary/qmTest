"use client";

import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import { useRouter } from "next/navigation";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Outfit:wght@600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #f0f4ff;
    min-height: 100vh;
    color: #1a1f36;
  }

  .page-wrap {
    min-height: 100vh;
    background: linear-gradient(135deg, #eef2ff 0%, #fafafa 50%, #f3f0ff 100%);
    padding: 16px 20px 24px;
  }

  /* ── Top Bar ── */
  .top-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: #ffffff;
    border: 1.5px solid #dde3f5;
    border-radius: 40px;
    color: #4f6af5;
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(79,106,245,0.08);
    text-decoration: none;
  }

  .back-btn:hover {
    background: #f0f4ff;
    border-color: #4f6af5;
    transform: translateX(-2px);
    box-shadow: 0 4px 16px rgba(79,106,245,0.14);
  }

  .back-btn svg {
    transition: transform 0.2s;
  }

  .back-btn:hover svg {
    transform: translateX(-2px);
  }

  .top-bar-title {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #050a16;
  }

  .top-bar-title span {
    color: #4f6af5;
  }

  /* ── Two-Panel Grid ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 24px;
    max-width: 1200px;
    margin: 0 auto;
    align-items: start;
  }

  @media (max-width: 900px) {
    .two-col {
      grid-template-columns: 1fr;
    }
  }

  /* ── Panel Base ── */
  .panel {
    background: #ffffff;
    border: 1px solid #e4e8f5;
    border-radius: 20px;
    box-shadow: 0 8px 40px rgba(79,106,245,0.07), 0 2px 8px rgba(0,0,0,0.03);
    position: relative;
    overflow: hidden;
  }

  .panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4f6af5, #7c6af7, #a78bfa);
  }

  .panel-header {
    padding: 18px 22px 0;
  }

  .panel-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(79,106,245,0.08);
    border: 1px solid rgba(79,106,245,0.18);
    color: #4f6af5;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 20px;
    margin-bottom: 6px;
  }

  .panel-title {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 800;
    color: #050a16;
    margin-bottom: 3px;
  }

  .panel-subtitle {
    font-size: 12px;
    color: #8892b0;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .panel-body {
    padding: 0 22px 22px;
  }

  /* ── Form Elements ── */
  .field-group {
    margin-bottom: 14px;
    animation: slideIn 0.3s ease forwards;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7db3;
    margin-bottom: 7px;
  }

  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    background: linear-gradient(135deg, #4f6af5, #a78bfa);
    border-radius: 50%;
    font-size: 9px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
  }

  select {
    width: 100%;
    background: #ffffff;
    border: 1.5px solid #dde3f5;
    border-radius: 10px;
    color: #1a1f36;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    padding: 9px 38px 9px 13px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7db3' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 14px;
  }

  select:focus {
    border-color: #4f6af5;
    background-color: #f5f8ff;
    box-shadow: 0 0 0 3px rgba(79,106,245,0.1);
  }

  select option { background: #ffffff; color: #1a1f36; }

  .submenu-panel {
    background: #f8faff;
    border: 1.5px solid #dde3f5;
    border-radius: 12px;
    padding: 4px 8px;
    animation: slideIn 0.3s ease forwards;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .checkbox-row:hover { background: rgba(79,106,245,0.06); }

  .checkbox-row input[type="checkbox"] {
    width: 17px; height: 17px;
    accent-color: #4f6af5;
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 13px;
    font-weight: 500;
    color: #2d3561;
    cursor: pointer;
    user-select: none;
    flex: 1;
  }

  .tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    background: rgba(79,106,245,0.08);
    color: #4f6af5;
    padding: 3px 8px;
    border-radius: 20px;
    border: 1px solid rgba(79,106,245,0.18);
    white-space: nowrap;
  }

  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #e4e8f5, transparent);
    margin: 14px 0;
  }

  /* ── Action Buttons ── */
  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  .save-btn {
    flex: 1;
    padding: 11px;
    background: linear-gradient(135deg, #4f6af5, #7c6af7);
    border: none;
    border-radius: 10px;
    color: white;
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 14px rgba(79,106,245,0.28);
  }

  .save-btn:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(79,106,245,0.38);
  }

  .save-btn:active:not(:disabled) { transform: translateY(0); }

  .save-btn:disabled {
    background: #c8d0e8;
    cursor: not-allowed;
    box-shadow: none;
  }

  .cancel-btn {
    padding: 11px 18px;
    background: #eef1ff;
    border: 1.5px solid #dde3f5;
    border-radius: 10px;
    color: #4f6af5;
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }

  .cancel-btn:hover {
    background: #e3e9ff;
    border-color: #4f6af5;
    transform: translateY(-1px);
  }

  /* ── Summary Panel ── */
  .summary-panel .panel-badge {
    background: rgba(124,106,247,0.08);
    border-color: rgba(124,106,247,0.2);
    color: #7c6af7;
  }

  .summary-panel .panel::before {
    background: linear-gradient(90deg, #7c6af7, #a78bfa, #c084fc);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #f0f4ff, #e8e4ff);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    font-size: 26px;
  }

  .empty-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #4f6af5;
    margin-bottom: 6px;
  }

  .empty-desc {
    font-size: 13px;
    color: #b0bad9;
    line-height: 1.6;
  }

  /* ── Summary Items ── */
  .summary-item {
    padding: 9px 0;
    border-bottom: 1px solid #edf0fa;
    animation: slideIn 0.35s ease forwards;
  }

  .summary-item:last-child { border-bottom: none; }

  .summary-item-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9aa5c4;
    margin-bottom: 2px;
  }

  .summary-item-value {
    font-size: 13px;
    font-weight: 600;
    color: #1a1f36;
  }

  .summary-item-value.empty-val {
    color: #c0c8e4;
    font-weight: 400;
    font-style: italic;
  }

  .status-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }

  .status-dot.filled { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
  .status-dot.empty  { background: #cbd5e1; }

  /* Progress stepper */
  .stepper {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 16px;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
  }

  .step-circle {
    width: 24px; height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    border: 2px solid #dde3f5;
    background: #fff;
    color: #b0bad9;
    transition: all 0.3s;
    z-index: 1;
  }

  .step-circle.active {
    border-color: #4f6af5;
    background: #4f6af5;
    color: white;
    box-shadow: 0 0 0 3px rgba(79,106,245,0.15);
  }

  .step-circle.done {
    border-color: #22c55e;
    background: #22c55e;
    color: white;
  }

  .step-connector {
    flex: 1;
    height: 2px;
    background: #e4e8f5;
    margin-top: -12px;
    transition: background 0.3s;
  }

  .step-connector.done { background: #22c55e; }

  .step-label {
    font-size: 9px;
    font-weight: 600;
    color: #b0bad9;
    margin-top: 4px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .step-item .step-circle.active ~ .step-label,
  .step-item.active-step .step-label { color: #4f6af5; }
  .step-item.done-step .step-label { color: #22c55e; }

  .empty-state {
    text-align: center;
    padding: 24px 16px;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #f0f4ff, #e8e4ff);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
    font-size: 20px;
  }

  .empty-title {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #4f6af5;
    margin-bottom: 4px;
  }

  .empty-desc {
    font-size: 12px;
    color: #b0bad9;
    line-height: 1.5;
  }

  .complete-banner {
    background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(79,106,245,0.06));
    border: 1.5px solid rgba(34,197,94,0.25);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    animation: slideIn 0.4s ease forwards;
  }

  .complete-check {
    width: 26px; height: 26px;
    background: #22c55e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 13px;
    color: white;
    box-shadow: 0 3px 10px rgba(34,197,94,0.3);
  }

  .complete-text-title {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #15803d;
    margin-bottom: 1px;
  }

  .complete-text-desc {
    font-size: 11px;
    color: #4ade80;
  }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #ffffff;
    border: 1px solid #ccd8f8;
    color: #1a1f36;
    padding: 14px 28px;
    border-radius: 40px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 12px 32px rgba(79,106,245,0.15);
    transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast-icon { color: #22c55e; font-size: 16px; }
`;

// Stepper component
function Stepper({ workspace, submenus, provider, language }) {
  const steps = [
    { label: "Workspace", done: !!workspace },
    { label: "Features", done: submenus.length > 0 },
    { label: "Provider", done: !!provider },
    { label: "Language", done: !!language },
  ];

  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const isDone = s.done;
        const isActive = !s.done && steps.slice(0, i).every(prev => prev.done);
        return (
          <>
            <div className={`step-item ${isDone ? "done-step" : ""} ${isActive ? "active-step" : ""}`} key={s.label}>
              <div className={`step-circle ${isDone ? "done" : isActive ? "active" : ""}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-connector ${isDone ? "done" : ""}`} key={`conn-${i}`} />
            )}
          </>
        );
      })}
    </div>
  );
}

export default function WorkspaceConfig() {
  const [tblmst_workspace, setWorkspaces] = useState([]);
  const [tblmst_workspaceSubmenu, setSubmenus] = useState([]);
  const [tblmst_Transcription_provider, setProviders] = useState([]);
  const [tblmst_Language, setLanguages] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [checkedSubmenus, setCheckedSubmenus] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDropdown("workspace", setWorkspaces);
    fetchDropdown("submenu", setSubmenus);
    fetchDropdown("provider", setProviders);
    fetchDropdown("language", setLanguages);
  }, []);

  const fetchDropdown = async (type, setter) => {
    try {
      const res = await fetch(`/api/workspace?type=${type}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: "1",
        },
      });
      const data = await res.json();
      if (data.success) setter(data.data);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
    }
  };

  const handleWorkspaceChange = (e) => {
    setSelectedWorkspace(e.target.value);
    setCheckedSubmenus([]);
    setSelectedProvider("");
    setSelectedLanguage("");
  };

  const handleSubmenuCheck = (id) => {
    setCheckedSubmenus((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!updated.includes(id)) {
        setSelectedProvider("");
        setSelectedLanguage("");
      }
      return updated;
    });
  };

  const handleProviderChange = (e) => {
    setSelectedProvider(e.target.value);
    setSelectedLanguage("");
  };

  const handleSave = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }
      setSaving(true);
      const payload = {
        workspace_id: selectedWorkspace,
        submenu_id: checkedSubmenus[0],
        provider_id: selectedProvider,
        language_id: selectedLanguage,
        created_by: userId,
      };
      const response = await fetch("/api/workspace/workspaceIntegration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        router.push(`/dashboard/workspace/configurationworkspace/${selectedWorkspace}`);
        setToast(true);
        setTimeout(() => setToast(false), 3000);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedWorkspace("");
    setCheckedSubmenus([]);
    setSelectedProvider("");
    setSelectedLanguage("");
  };

  const showSubmenu = !!selectedWorkspace;
  const showProvider = checkedSubmenus.length > 0;
  const showLanguage = !!selectedProvider;
  const canSave = selectedWorkspace && checkedSubmenus.length > 0 && selectedProvider && selectedLanguage;

  const workspaceName = tblmst_workspace.find((w) => w.Id == selectedWorkspace)?.Workspace;
  const providerName = tblmst_Transcription_provider.find((p) => p.Id == selectedProvider)?.Provider_name;
  const languageName = tblmst_Language.find((l) => l.Id == selectedLanguage)?.Language;
  const submenuNames = tblmst_workspaceSubmenu.filter((s) => checkedSubmenus.includes(s.Id)).map((s) => s.submenu_name);

  const summaryFields = [
    { label: "Workspace", value: workspaceName, placeholder: "Not selected yet" },
    { label: "Modules", value: submenuNames.join(", ") || null, placeholder: "No features selected" },
    { label: "Provider", value: providerName, placeholder: "Not selected yet" },
    { label: "Language", value: languageName, placeholder: "Not selected yet" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="page-wrap">

        {/* ── Top Bar with Back Button ── */}
        <div className="top-bar">
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
          <span className="top-bar-title">Workspace <span>Configuration</span></span>
        </div>

        {/* ── Two-Column Layout ── */}
        <div className="two-col">

          {/* ── LEFT: Configuration Form ── */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>
                Setup
              </div>
              <div className="panel-title">Configure Workspace</div>
              <p className="panel-subtitle">Select your workspace and configure transcription settings step by step.</p>
            </div>
            <div className="panel-body">

              {/* Step 1 — Workspace */}
              <div className="field-group">
                <div className="field-label">
                  <span className="step-num">1</span>
                  Select Workspace
                </div>
                <select value={selectedWorkspace} onChange={handleWorkspaceChange}>
                  <option value="">— Choose a workspace —</option>
                  {tblmst_workspace.map((w) => (
                    <option key={w.Id} value={w.Id}>{w.Workspace}</option>
                  ))}
                </select>
              </div>

              {/* Step 2 — Submenu */}
              {showSubmenu && (
                <div className="field-group">
                  <div className="field-label">
                    <span className="step-num">2</span>
                    Select Features
                  </div>
                  <div className="submenu-panel">
                    {tblmst_workspaceSubmenu.map((s) => (
                      <label key={s.Id} className="checkbox-row" htmlFor={`sub-${s.Id}`}>
                        <input
                          type="checkbox"
                          id={`sub-${s.Id}`}
                          checked={checkedSubmenus.includes(s.Id)}
                          onChange={() => handleSubmenuCheck(s.Id)}
                        />
                        <span className="checkbox-label">{s.submenu_name}</span>
                        <span className="tag">Module</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 — Provider */}
              {showProvider && (
                <div className="field-group">
                  <div className="field-label">
                    <span className="step-num">3</span>
                    Transcription Provider
                  </div>
                  <select value={selectedProvider} onChange={handleProviderChange}>
                    <option value="">— Choose a provider —</option>
                    {tblmst_Transcription_provider.map((p) => (
                      <option key={p.Id} value={p.Id}>{p.Provider_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 4 — Language */}
              {showLanguage && (
                <div className="field-group">
                  <div className="field-label">
                    <span className="step-num">4</span>
                    Language
                  </div>
                  <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                    <option value="">— Choose a language —</option>
                    {tblmst_Language.map((l) => (
                      <option key={l.Id} value={l.Id}>{l.Language}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="divider" />

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="save-btn" onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? "Saving…" : "Save Configuration"}
                </button>
                <button className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>

            </div>
          </div>

          {/* ── RIGHT: Summary Panel ── */}
          <div className="summary-panel">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11l3 3L22 4" /></svg>
                  Live Preview
                </div>
                <div className="panel-title">Configuration Summary</div>
                <p className="panel-subtitle">Your selections will appear here as you configure.</p>
              </div>
              <div className="panel-body">

                {/* Progress Stepper */}
                <Stepper
                  workspace={selectedWorkspace}
                  submenus={checkedSubmenus}
                  provider={selectedProvider}
                  language={selectedLanguage}
                />

                {!selectedWorkspace ? (
                  <div className="empty-state">
                    <div className="empty-icon">🗂️</div>
                    <div className="empty-title">No workspace selected</div>
                    <p className="empty-desc">Start by choosing a workspace on the left to see your configuration summary here.</p>
                  </div>
                ) : (
                  <>
                    {summaryFields.map((f) => (
                      <div className="summary-item" key={f.label}>
                        <div className="summary-item-label">
                          <span className={`status-dot ${f.value ? "filled" : "empty"}`} />
                          {f.label}
                        </div>
                        <div className={`summary-item-value ${f.value ? "" : "empty-val"}`}>
                          {f.value || f.placeholder}
                        </div>
                      </div>
                    ))}

                    {canSave && (
                      <div className="complete-banner">
                        <div className="complete-check">✓</div>
                        <div>
                          <div className="complete-text-title">Ready to save!</div>
                          <div className="complete-text-desc">All fields are configured</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>
        <span className="toast-icon">✓</span>
        Configuration saved successfully!
      </div>
    </>
  );
}