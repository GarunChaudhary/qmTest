"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f2f8; font-family: 'Sora', sans-serif; }
    button, input, select, textarea { font-family: inherit; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.985); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeInCard {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .option-card:nth-child(1) { animation: fadeInCard 0.32s ease 0.05s both; }
    .option-card:nth-child(2) { animation: fadeInCard 0.32s ease 0.12s both; }

    .field-input {
      width: 100%;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 14px;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }
    .field-input:focus {
      border-color: #6b9fd4;
      background: #fff;
      box-shadow: 0 0 0 3px #6b9fd418;
    }
    .field-input::placeholder { color: #b0bec5; }
    select.field-input { cursor: pointer; appearance: none; -webkit-appearance: none; }

    .btn-dark {
      background: #1e293b;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 9px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
    }
    .btn-dark:hover {
      background: #0f172a;
      box-shadow: 0 4px 14px #1e293b28;
      transform: translateY(-1px);
    }
    .btn-dark:active { transform: translateY(0); }

    .btn-ghost {
      background: #fff;
      color: #64748b;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 9px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-ghost:hover {
      border-color: #cbd5e1;
      color: #334155;
      background: #f8fafc;
      transform: translateX(-2px);
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: 1.5px solid #e2e8f0;
      color: #64748b;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 500;
      padding: 6px 13px 6px 9px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
    }
    .back-btn:hover {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
      transform: translateX(-2px);
    }
  `}</style>
);

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
        {label}
        {required && <span style={{ color: "#c47474", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: "#c47474", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#c47474" strokeWidth="1.4" />
            <path d="M6.5 4v2.8M6.5 8.5h.01" stroke="#c47474" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

const LANGUAGES = [
  "English (US)", "English (UK)", "Spanish", "French",
  "German", "Hindi", "Portuguese", "Arabic", "Mandarin", "Japanese",
];

function NewSTTModal({ onSave, onCancel }) {
  const [apiKey, setApiKey] = useState("");
  const [language, setLanguage] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!apiKey.trim()) e.apiKey = "API Key is required";
    if (!language.trim()) e.language = "Please select a language";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ apiKey, language });
  };

  const clearErr = (field) => setErrors(prev => ({ ...prev, [field]: "" }));

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(5px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
        animation: "slideUp 0.26s ease", overflow: "hidden",
      }}>
        <div style={{
          padding: "22px 26px 18px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: "#f0f4f8",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" stroke="#6b9fd4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#6b9fd4" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="12" y1="19" x2="12" y2="23" stroke="#6b9fd4" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="8" y1="23" x2="16" y2="23" stroke="#6b9fd4" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>New STT Configuration</h2>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Speech-to-Text provider setup</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: "#f1f5f9", border: "none", borderRadius: 8,
              width: 30, height: 30, cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", fontSize: 14, transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
          >✕</button>
        </div>

        <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Field label="API Key" required error={errors.apiKey}>
            <div style={{ position: "relative" }}>
              <input
                className="field-input"
                type={showKey ? "text" : "password"}
                placeholder="Paste your API key here"
                value={apiKey}
                style={{ paddingRight: 42 }}
                onChange={(e) => { setApiKey(e.target.value); clearErr("apiKey"); }}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#94a3b8", padding: 0, display: "flex", alignItems: "center",
                }}
              >
                {showKey ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
            <span style={{ fontSize: 11, color: "#b0bec5" }}>Your key is encrypted and never shared.</span>
          </Field>

          <Field label="Language" required error={errors.language}>
            <div style={{ position: "relative" }}>
              <select
                className="field-input"
                value={language}
                onChange={(e) => { setLanguage(e.target.value); clearErr("language"); }}
              >
                <option value="">Select a language…</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5l4 4 4-4" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Field>
        </div>

        <div style={{
          padding: "16px 26px 22px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-dark" onClick={handleSave}>
            Save
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionCard({ value, selected, onSelect, icon, title, description, tag }) {
  const active = selected === value;
  return (
    <button
      className="option-card"
      onClick={() => onSelect(value)}
      style={{
        background: active ? "#fff" : "#fafbfd",
        border: `2px solid ${active ? "#6b9fd4" : "#e2e8f0"}`,
        borderRadius: 16, padding: "20px 22px",
        cursor: "pointer", textAlign: "left", width: "100%",
        transition: "all 0.2s ease",
        boxShadow: active ? "0 4px 18px rgba(107,159,212,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
        position: "relative", outline: "none",
      }}
    >
      <div style={{
        position: "absolute", top: 16, right: 16,
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${active ? "#6b9fd4" : "#cbd5e1"}`,
        background: active ? "#6b9fd4" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s ease",
      }}>
        {active && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: active ? "#eef5fb" : "#f1f5f9",
        border: `1px solid ${active ? "#6b9fd430" : "transparent"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 12, transition: "all 0.18s ease",
      }}>
        {icon}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: active ? "#1a3a5c" : "#334155", transition: "color 0.18s" }}>
          {title}
        </h3>
        {tag && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.4px",
            background: "#eef5fb", color: "#6b9fd4", border: "1px solid #c7ddf0",
            padding: "2px 8px", borderRadius: 20,
          }}>{tag}</span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.55, paddingRight: 24 }}>
        {description}
      </p>
    </button>
  );
}

export default function TranscriptionPage({ params }) {
  const { id } = params;
  const router = useRouter();

  const [selected, setSelected] = useState("import");
  const [showModal, setShowModal] = useState(false);

  const goToColumnMapping = () => router.push(`/dashboard/workspace/column-mapping/${id}`);

  const handleNext = () => {
    if (selected === "newSTT") { setShowModal(true); }
    else { goToColumnMapping(); }
  };

  const handleModalSave = (data) => {
    console.log("STT config:", data);
    setShowModal(false);
    goToColumnMapping();
  };

  return (
    <>
      <GlobalStyles />

      {showModal && (
        <NewSTTModal onSave={handleModalSave} onCancel={() => setShowModal(false)} />
      )}

      <div style={{
        background: "hsl(var(--background, 0 0% 97%))",
        minHeight: "100vh",
        fontFamily: "'Sora', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 24px 60px",
      }}>
        {/* ── Top bar: back + title inline ── */}
        <div style={{
          width: "100%", maxWidth: 580,
          display: "flex", alignItems: "center", gap: 14,
          marginBottom: 24,
        }}>
          <button className="back-btn" onClick={() => router.back()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div style={{ width: 1, height: 26, background: "#e2e8f0", flexShrink: 0 }} />

          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px", margin: 0 }}>
              Configure Transcription
            </h1>
          </div>
        </div>

        {/* ── Main card ── */}
        <div style={{
          width: "100%", maxWidth: 580,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
          animation: "fadeInCard 0.38s ease both",
        }}>

          {/* Card header */}
          <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#f0f2f8", border: "1px solid #e2e8f0",
              borderRadius: 20, padding: "4px 12px", marginBottom: 12,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "#1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff",
              }}>1</div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", letterSpacing: "0.3px" }}>
                STEP 1 OF 2
              </span>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px", marginBottom: 5 }}>
              Transcription Setup
            </h2>
            <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6 }}>
              Choose how you want to handle transcription for this integration.
            </p>
          </div>

          {/* Options */}
          <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <OptionCard
              value="import"
              selected={selected}
              onSelect={setSelected}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={selected === "import" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="7 10 12 15 17 10" stroke={selected === "import" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="15" x2="12" y2="3" stroke={selected === "import" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              title="Import"
              description="Use an existing transcription file or import data from a previously configured source."
            />

            <OptionCard
              value="newSTT"
              selected={selected}
              onSelect={setSelected}
              tag="RECOMMENDED"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" stroke={selected === "newSTT" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={selected === "newSTT" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="23" stroke={selected === "newSTT" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" stroke={selected === "newSTT" ? "#6b9fd4" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
              title="New STT"
              description="Set up a new Speech-to-Text provider by configuring your API key and language preferences."
            />
          </div>

          {/* Card footer */}
          <div style={{
            padding: "16px 24px 22px",
            borderTop: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6b9fd4" }} />
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {selected === "import" ? "Import selected" : "New STT selected"}
              </span>
            </div>

            <button className="btn-dark" onClick={handleNext}>
              Next
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "#b0bec5", marginTop: 16 }}>
          You can update this setting later from the platform configuration panel.
        </p>
      </div>
    </>
  );
}