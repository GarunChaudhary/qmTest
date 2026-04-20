"use client";
import { useEffect, useMemo, useState } from "react";
import CryptoJS from "crypto-js";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import NotFound from "@/components/NotFound";
import { ChevronLeft, Search, ChevronDown, ChevronRight, Shield, Building2, Check, Save } from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }

/* ────────────────────────────────────────────
   BUTTON SYSTEM
   primary bg : var(--brand-primary)
   hover      : var(--brand-secondary)
   accent text: var(--brand-primary)
──────────────────────────────────────────── */

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 16px;
  font-size: 11.5px; font-weight: 600; white-space: nowrap;
  color: #ffffff;
  background: var(--brand-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(1,41,155,.25);
  transition: background .14s ease, box-shadow .14s ease, transform .1s ease;
}
.btn-primary:hover:not(:disabled) {
  background: var(--brand-secondary);
  box-shadow: 0 4px 10px rgba(44,45,63,.28);
  transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: 0 1px 3px rgba(1,41,155,.18); }
.btn-primary:disabled { opacity: .42; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 14px;
  font-size: 11.5px; font-weight: 600; white-space: nowrap;
  color: #374151;
  background: #ffffff;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease, color .14s ease;
}
.btn-ghost:hover:not(:disabled) { background: #F3F4F6; border-color: #9CA3AF; color: #111827; }
.btn-ghost:active:not(:disabled) { background: #E5E7EB; }
.btn-ghost:disabled { opacity: .42; cursor: not-allowed; }

.btn-spinner {
  width: 12px; height: 12px;
  border: 1.5px solid rgba(255,255,255,.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: btnSpin .65s linear infinite;
}
@keyframes btnSpin { to { transform: rotate(360deg); } }

/* Scrollbar polish */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(107,114,128,.35) transparent;
}
*::-webkit-scrollbar { height: 8px; width: 8px; }
*::-webkit-scrollbar-thumb {
  background: rgba(107,114,128,.35);
  border-radius: 999px;
}
*::-webkit-scrollbar-track { background: transparent; }
`;

// ── Privilege chip ────────────────────────────────────────────────────────────
function PrivilegeChip({ label, selected, disabled, onChange }) {
  return (
    <label
      className={`
        flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium
        text-left transition-all duration-150 select-none
        ${disabled
          ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
        }
      `}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
        checked={selected}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

// ── Module toggle ─────────────────────────────────────────────────────────────
function ModuleToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full
                 transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? "var(--brand-primary)" : "#E5E7EB" }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm
                   transition-transform duration-200"
        style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

// ── Org tree node ─────────────────────────────────────────────────────────────
function OrgNode({ node, depth, selectedOrgIds, onToggle, onActivate }) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = selectedOrgIds.includes(String(node.id));
  const hasChildren = (node.children || []).length > 0;
  const displayName = node.label || node.name || node.OrgName || node.Name || "Untitled";

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={`
            flex-shrink-0 w-5 h-6 flex items-center justify-center rounded transition-colors duration-100
            ${hasChildren ? "text-gray-400 hover:text-gray-600" : "cursor-default text-transparent"}
          `}
        >
          {hasChildren && (open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </button>

        <label className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
            checked={isSelected}
            onChange={() => onToggle(node.id, displayName)}
          />
          <button
            type="button"
            onClick={() => onActivate(node.id, displayName)}
            className={`flex-1 min-w-0 text-left text-xs whitespace-nowrap px-2 py-1.5 rounded-md transition-colors duration-100 ${
              isSelected
                ? "text-[var(--brand-primary)] font-semibold"
                : "text-gray-700 hover:text-[var(--brand-primary)]"
            }`}
          >
            {displayName}
          </button>
        </label>
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 ml-5 pl-2.5 border-l border-gray-100 space-y-0.5">
          {node.children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedOrgIds={selectedOrgIds}
              onToggle={onToggle}
              onActivate={onActivate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      {title && <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>}
      <p className="text-[11px] text-gray-400 max-w-[180px] leading-relaxed">{message}</p>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full animate-spin"
             style={{ border: "1.5px solid #E5E7EB", borderTopColor: "var(--brand-primary)" }} />
        <span className="text-[11px] text-gray-400">Loading…</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RoleModulesPage({ params }) {
  const router = useRouter();
  const roleid = params.id;
  const searchParams = useSearchParams();
  const roleName = searchParams.get("roleName");

  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState({});
  const [modulePrivileges, setModulePrivileges] = useState({});
  const [collapsedModules, setCollapsedModules] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);
  const [orgTree, setOrgTree] = useState([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [selectedOrgNames, setSelectedOrgNames] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { fetchPrivilege(); }, []);

  const fetchPrivilege = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      sessionStorage.removeItem("interactionDateRange");
      sessionStorage.removeItem("selectedCallStatus");
      let userRole = null;
      let superAdmin = false;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          userRole = user?.userId || null;
          const roles = user?.userRoles || [];
          superAdmin = Array.isArray(roles) && roles.some((r) => Number(r?.roleId) === 112);
          setIsSuperAdmin(superAdmin);
        } catch { /* silent */ }
      }
      if (!superAdmin && Number(roleid) === 112) { router.replace("/not-found"); return; }
      const res = await fetch("/api/moduleswithPrivileges", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userRole,
          moduleId: 7,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        cache: "no-store",
      });
      const data = await res.json();
      const ok = res.ok && (data.PrivilegeList || []).some((p) => p.PrivilegeId === 12);
      setHasAccess(ok);
      if (!ok) router.replace("/not-found");
    } catch {
      setHasAccess(false);
      router.replace("/not-found");
    }
  };

  useEffect(() => { fetchOrganizationTree(); }, []);

  const fetchOrganizationTree = async () => {
    try {
      const res = await fetch("/api/organization/root", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) return;
      const normalize = (node) => ({
        id: node.id,
        label: node.Name || node.label || "Untitled",
        children: (node.children || []).map(normalize),
      });
      const roots = Array.isArray(data.organizations) ? data.organizations.map(normalize) : [];
      setOrgTree(roots);
    } catch {
      console.error("Not Found");
      
    }
  };

  // No auto-selection on load; user must choose org(s) manually.

  useEffect(() => {
    if (roleid && selectedOrgIds.length > 0) fetchModulesWithPrivileges(activeOrgId || selectedOrgIds[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleid, selectedOrgIds, activeOrgId]);

  useEffect(() => {
    if (selectedOrgIds.length === 0) { if (activeOrgId) setActiveOrgId(""); return; }
    if (!activeOrgId || !selectedOrgIds.includes(activeOrgId))
      setActiveOrgId(selectedOrgIds[selectedOrgIds.length - 1]);
  }, [selectedOrgIds, activeOrgId]);

  const fetchModulesWithPrivileges = async (orgId) => {
    try {
      const res = await fetch(`/api/roleManagement/${roleid}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
      });
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      if (res.ok) {
        setModules(data.modules || []);
        data.modules.forEach((m) => fetchPrivileges(roleid, m.ID, m.ModuleName, orgId));
      }
    } catch { /* silent */ }
  };

  const fetchPrivileges = async (roleId, moduleId, moduleName, orgId, forceChecked = false) => {
    try {
      const res = await fetch(`/api/roleManagement/savedPrivileges/${roleId}/${moduleId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: orgId || "",
        },
      });
      const data = await res.json();
      if (!res.ok) return;
      const savedIds = data.savedPrivileges.map((p) => p.PrivilegeId);
      const noneSelected = savedIds.includes(11);
      const hasSaved = savedIds.length > 0;
      setSelectedModules((prev) => ({
        ...prev,
        [moduleId]: { checked: hasSaved || forceChecked, name: moduleName },
      }));
      setModulePrivileges((prev) => ({
        ...prev,
        [moduleId]: data.privileges.map((p) => ({
          ...p,
          selected: savedIds.includes(p.PrivilegeId),
          disabled: noneSelected && p.PrivilegeId !== 11,
        })),
      }));
    } catch { /* silent */ }
  };

  const findOrgName = (nodes, id) => {
    for (const n of nodes || []) {
      if (String(n.id) === String(id)) return n.label;
      const hit = findOrgName(n.children, id);
      if (hit) return hit;
    }
    return "";
  };

  useEffect(() => {
    if (selectedOrgIds.length > 0 && orgTree.length > 0) {
      const names = selectedOrgIds.map((id) => findOrgName(orgTree, id)).filter(Boolean);
      if (names.length) setSelectedOrgNames(names);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgIds, orgTree]);

  const handleOrgToggle = (orgId, orgName) => {
    const nextId = String(orgId);
    setSelectedOrgIds((prev) => {
      const next = prev.includes(nextId) ? prev.filter((id) => id !== nextId) : [...prev, nextId];
      const nextActive = next.includes(nextId) ? nextId : (next[next.length - 1] || "");
      setActiveOrgId(nextActive);
      if (nextActive) {
        setSelectedModules({});
        setModulePrivileges({});
        setCollapsedModules({});
        fetchModulesWithPrivileges(nextActive);
      }
      return next;
    });
    setSelectedOrgNames((prev) => {
      if (!orgName) return prev;
      return prev.includes(orgName) ? prev.filter((n) => n !== orgName) : [...prev, orgName];
    });
  };

  const handleOrgActivate = (orgId, orgName) => {
    const nextId = String(orgId);
    if (!selectedOrgIds.includes(nextId)) {
      handleOrgToggle(nextId, orgName);
      return;
    }
    setActiveOrgId(nextId);
    setSelectedModules({});
    setModulePrivileges({});
    setCollapsedModules({});
    fetchModulesWithPrivileges(nextId);
  };

  const filteredOrgTree = useMemo(() => {
    if (!orgSearch.trim()) return orgTree;
    const q = orgSearch.trim().toLowerCase();
    const filter = (node) => {
      const children = (node.children || []).map(filter).filter(Boolean);
      return (node.label || "").toLowerCase().includes(q) || children.length ? { ...node, children } : null;
    };
    return orgTree.map(filter).filter(Boolean);
  }, [orgTree, orgSearch]);

  const orgCount = useMemo(() => {
    const count = (nodes) => (nodes || []).reduce((acc, n) => acc + 1 + count(n.children || []), 0);
    return count(orgTree);
  }, [orgTree]);

  const handleCollapseToggle = (moduleId) =>
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

  const handleCheckboxChange = async (moduleId, moduleName) => {
    const isChecked = !selectedModules[moduleId]?.checked;
    setSelectedModules((prev) => ({ ...prev, [moduleId]: { checked: isChecked, name: moduleName } }));
    if (isChecked && !modulePrivileges[moduleId]) {
      await fetchPrivileges(roleid, moduleId, moduleName, activeOrgId || selectedOrgIds[0] || "", true);
    } else if (!isChecked) {
      setModulePrivileges((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map((p) => ({ ...p, selected: false, disabled: false })),
      }));
    }
  };

  const handlePrivilegeChange = (moduleId, privilegeId) => {
    setModulePrivileges((prev) => {
      const current = prev[moduleId] || [];
      const isNone = privilegeId === 11;
      let updated = current.map((p) => {
        if (isNone) {
          if (p.PrivilegeId === 11) return { ...p, selected: !p.selected };
          return { ...p, selected: false };
        } else {
          if (p.PrivilegeId === 11 && p.selected) return { ...p, selected: false };
          if (p.PrivilegeId === privilegeId) return { ...p, selected: !p.selected };
          return p;
        }
      });
      const noneNowSelected = updated.find((p) => p.PrivilegeId === 11)?.selected ?? false;
      updated = updated.map((p) => ({ ...p, disabled: p.PrivilegeId !== 11 && noneNowSelected }));
      return { ...prev, [moduleId]: updated };
    });
  };

  const handleSubmit = async () => {
    const activeOrgIds = selectedOrgIds.filter(Boolean);
    if (!activeOrgIds.length) { alert("Please select at least one organization."); return; }
    const selectedModuleIds = Object.keys(selectedModules).filter((id) => selectedModules[id].checked);
    const uncheckedModuleIds = Object.keys(selectedModules).filter((id) => !selectedModules[id].checked);
    let userId = null, userName = null;
    const enc = sessionStorage.getItem("user");
    if (enc) {
      try {
        const user = JSON.parse(CryptoJS.AES.decrypt(enc, "").toString(CryptoJS.enc.Utf8));
        userId = user?.userId || null;
        userName = user?.userFullName || null;
      } catch { /* silent */ }
    }
    const privilegesToSaveByOrg = {};
    let hasAny = false;
    for (const moduleId of selectedModuleIds) {
      const privs = (modulePrivileges[moduleId] || []).filter((p) => p.selected);
      if (parseInt(moduleId) === 5) {
        if (privs.some((p) => p.PrivilegeId === 16) && !privs.some((p) => p.PrivilegeId === 10)) {
          alert('Please select "Create/Edit" privilege for module Form Designer.');
          return;
        }
      }
      if (!privs.length) { alert(`Select at least one privilege for: ${selectedModules[moduleId].name}`); return; }
      activeOrgIds.forEach((orgId) => {
        if (!privilegesToSaveByOrg[orgId]) privilegesToSaveByOrg[orgId] = [];
        privs.forEach((p) => {
          privilegesToSaveByOrg[orgId].push({ roleid, moduleId, privilegeId: p.PrivilegeId, orgId, userId });
          hasAny = true;
        });
      });
    }
    if (!hasAny) { alert("Select privileges before saving."); return; }
    for (const moduleId of uncheckedModuleIds) {
      if ((modulePrivileges[moduleId] || []).some((p) => p.selected)) {
        alert(`Enable module "${selectedModules[moduleId].name}" before assigning privileges.`);
        return;
      }
    }
    setSaving(true);
    try {
      for (const orgId of activeOrgIds) {
        const res = await fetch("/api/roleManagement/save", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          body: JSON.stringify({
            privilegesToSave: privilegesToSaveByOrg[orgId] || [],
            uncheckedModuleIds, roleid, roleName, userId, userName, orgId,
          }),
        });
        const result = await res.json();
        if (!res.ok) { alert(`Failed for org ${orgId}: ${result.message}`); setSaving(false); return; }
      }
      alert("Privileges saved successfully.");
      window.location.href = "/dashboard/roleManagement";
    } catch (err) { alert(`Error: ${err.message}`); }
    setSaving(false);
  };

  if (hasAccess === null) return <Spinner />;
  if (hasAccess === false) return null;
  if (notFound) {
    return (
      <NotFound
        message="The role you are trying to assign privileges to does not exist."
        redirectUrl="/dashboard/roleManagement"
        redirectText="Go Back"
      />
    );
  }

  const selectedOrgOptions = selectedOrgIds
    .map((id) => ({ id, label: findOrgName(orgTree, id) || id }))
    .filter((o) => o.label);

  const noOrgSelected = selectedOrgIds.length === 0;
  const showModules = !noOrgSelected && modules.length > 0;
  const noModules = !noOrgSelected && modules.length === 0;
  const displayOrgLabel =
    selectedOrgNames.length > 1 ? `${selectedOrgNames.length} organizations` : selectedOrgNames[0] || "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      <div className="min-h-screen bg-[#F8F9FA]">

        {/* ── TOP BAR ── */}
        <header className="relative z-0 bg-transparent">
          <div className="max-w-screen-xl mx-auto px-6 pt-2 pb-2">
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard/roleManagement")}
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  {/* <p className="text-[11px] text-gray-400 leading-[1] mt-[2px]">Role Management</p> */}
                  <div className="flex items-center gap-2 min-w-0 leading-none">
                    <Shield className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 relative -top-[1px]" />
                    <h1 className="text-sm font-semibold text-gray-900 truncate">Role Privileges</h1>
                    {roleName && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                        Role: {roleName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {selectedOrgOptions.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">
                      {selectedOrgOptions.length} org{selectedOrgOptions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    onClick={() => { setSelectedModules({}); setModulePrivileges({}); }}
                    className="btn-ghost"
                  >
                    Clear
                  </button>
                  <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                    {saving ? <><span className="btn-spinner" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save changes</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="max-w-screen-xl mx-auto px-6 py-3">
          <div className="grid grid-cols-[280px_1fr] gap-4 items-stretch">

            {/* ── LEFT SIDEBAR ── */}
            <aside
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-[48px] flex flex-col shadow-sm"
              style={{ height: "calc(100vh - 120px)" }}
            >
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
                    <span className="text-xs font-semibold text-gray-700">Organizations</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#F3F4F6", color: "var(--brand-primary)" }}>
                    {orgCount}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="Search organizations…"
                    className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg
                               bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-blue-300
                               focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Selected orgs */}
              {selectedOrgOptions.length > 0 && (
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                      Active ({selectedOrgOptions.length})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedOrgIds([]); setSelectedOrgNames([]);
                        setActiveOrgId(""); setSelectedModules({});
                        setModulePrivileges({}); setCollapsedModules({});
                      }}
                      className="text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedOrgOptions.map((org) => {
                      const isActive = String(activeOrgId) === String(org.id);
                      return (
                        <div key={org.id} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                            checked
                            onChange={() => handleOrgToggle(org.id, org.label)}
                          />
                          <button
                            type="button"
                            onClick={() => handleOrgActivate(org.id, org.label)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                            style={isActive
                              ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)", color: "#fff" }
                              : { background: "#fff", borderColor: "#D1D5DB", color: "var(--brand-primary)" }
                            }
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--brand-primary)"; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#D1D5DB"; }}
                          >
                            {org.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tree */}
              <div className="flex-1 overflow-auto overflow-x-auto px-3 py-3">
                {filteredOrgTree.length > 0 ? (
                  <ul className="space-y-1">
                    {filteredOrgTree.map((node) => (
                      <OrgNode
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedOrgIds={selectedOrgIds}
                        onToggle={handleOrgToggle}
                        onActivate={handleOrgActivate}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-gray-400 py-6 text-center">No results for `${orgSearch}`</p>
                )}
              </div>
            </aside>

            {/* ── RIGHT PANEL ── */}
            <section className="min-w-0">
              <div className="bg-transparent flex flex-col gap-3" style={{ height: "calc(100vh - 120px)" }}>

              {/* Context header */}
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {noOrgSelected ? "No organization selected" : displayOrgLabel}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {noOrgSelected
                      ? "Pick an organization from the sidebar to begin"
                      : `${modules.length} module${modules.length !== 1 ? "s" : ""} available · Role: ${roleName || "—"}`}
                  </p>
                </div>

                {selectedOrgOptions.length > 1 && (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">Previewing</span>
                    <select
                      value={activeOrgId || selectedOrgOptions[0]?.id || ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        setActiveOrgId(next); setSelectedModules({});
                        setModulePrivileges({}); setCollapsedModules({});
                        fetchModulesWithPrivileges(next);
                      }}
                      className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white
                                 focus:outline-none focus:border-blue-300 max-w-[160px] truncate"
                    >
                      {selectedOrgOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Multi-org warning */}
              {selectedOrgOptions.length > 1 && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700">
                    Changes apply to all {selectedOrgOptions.length} selected organizations simultaneously.
                  </p>
                </div>
              )}

              {/* Modules panel */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0">
                <div className="overflow-auto h-full">

                  {noOrgSelected && (
                    <EmptyState icon={Building2} title="Select an organization"
                      message="Choose one or more organizations from the sidebar to load role privileges." />
                  )}
                  {noModules && (
                    <EmptyState icon={Shield} title="No modules found"
                      message="No modules are configured for this role." />
                  )}

                  {showModules && (
                    <ul className="divide-y divide-gray-100">
                      {modules.map((module) => {
                        const isChecked = !!selectedModules[module.ID]?.checked;
                        const isCollapsed = !!collapsedModules[module.ID];
                        const privileges = modulePrivileges[module.ID] || [];
                        const selectedCount = privileges.filter((p) => p.selected).length;

                        return (
                          <li key={module.ID}>
                            <div className={`flex items-center gap-4 px-5 py-4 transition-colors
                              ${isChecked ? "bg-white" : "bg-white hover:bg-gray-50/50"}`}>
                              <ModuleToggle
                                checked={isChecked}
                                onChange={() => handleCheckboxChange(module.ID, module.ModuleName)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate transition-colors
                                  ${isChecked ? "text-gray-900" : "text-gray-400"}`}>
                                  {module.ModuleName}
                                </p>
                                {isChecked && privileges.length > 0 && (
                                  <p className="text-[10px] mt-0.5" style={{ color: "var(--brand-primary)" }}>
                                    {selectedCount} of {privileges.length} privilege{privileges.length !== 1 ? "s" : ""} enabled
                                  </p>
                                )}
                              </div>

                              {isChecked && privileges.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleCollapseToggle(module.ID)}
                                  className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold
                                             px-2.5 py-1 rounded-md border transition-all"
                                  style={{ color: "var(--brand-primary)", background: "#F3F4F6", borderColor: "#F3F4F6" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#E5E7EB"; e.currentTarget.style.borderColor = "#D1D5DB"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.borderColor = "#F3F4F6"; }}
                                >
                                  {isCollapsed ? "Show" : "Hide"}
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                                </button>
                              )}
                            </div>

                            {isChecked && !isCollapsed && privileges.length > 0 && (
                              <div className="px-5 pb-4 pt-3 bg-gray-50/60 border-t border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {privileges.map((priv) => (
                                    <PrivilegeChip
                                      key={priv.PrivilegeId}
                                      label={priv.PrivilegeName}
                                      selected={priv.selected}
                                      disabled={priv.disabled}
                                      onChange={() => handlePrivilegeChange(module.ID, priv.PrivilegeId)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
