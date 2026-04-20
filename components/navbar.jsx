// components\navbar.jsx
"use client";
import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  Home,
  Users2,
  Briefcase,
  Handshake,
  Building,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { FaBriefcase, FaUserCog } from "react-icons/fa";
import { MdOutlineSecurity, MdDataExploration } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import withAuth from "@/components/withAuth";

// Icon mapping based on menuSequenceNo
// 5 (Forms) and 9 (OrgMapping) removed — shown via hardcoded Forms & Mapping
// 2 (Users), 7 (Roles), 8 (Organization) removed — shown via hardcoded Management
const iconMapping = {
  1: <Home className="h-4 w-4" />,
  // 3: <Briefcase className="h-4 w-4" />,
  4: <Handshake className="h-4 w-4" />,
  6: <PhoneCall className="h-4 w-4" />,
  10: <FileText className="h-4 w-4" />,
  11: <FaBriefcase className="h-4 w-4" />,
  12: <MdOutlineSecurity className="h-4 w-4" />,
  13: <MdDataExploration className="h-4 w-4" />
};

// Hardcoded module 1 — Forms + Mapping combined
const HARDCODED_MODULE = {
  moduleName: "Form Management",
  redirectPath: "/dashboard/forms-combined",
  icon: <LayoutDashboard className="h-4 w-4" />,
};

// Hardcoded module 2 — Users + Organization + Roles combined
const HARDCODED_MANAGEMENT_MODULE = {
  moduleName: "User Management",
  redirectPath: "/dashboard/Management_combined_page",
  icon: <ShieldCheck className="h-4 w-4" />,
};

const isWorkspaceModule = (module) => {
  const moduleName = String(module?.moduleName || "").toLowerCase();
  const redirectPath = String(module?.redirectPath || "").toLowerCase();

  return (
    moduleName.includes("workspace") ||
    redirectPath.includes("/dashboard/workspace") ||
    redirectPath.includes("/dashboard/integrationworkspace")
  );
};

const Navbar = ({ collapsed, onClose, onToggle }) => {
  const pathname = usePathname();
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [showHardcodedModule, setShowHardcodedModule] = useState(false);
  const [showManagementModule, setShowManagementModule] = useState(false);
  const [managementAccess, setManagementAccess] = useState({ users: false, roles: false, org: false });
  const [formsAccess, setFormsAccess] = useState({ forms: false, mapping: false });
  const [reportsAccess, setReportsAccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [openManagement, setOpenManagement] = useState(false);
  const [openForms, setOpenForms] = useState(false);
  const [openReports, setOpenReports] = useState(false);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem("user");
      if (!storedUser) throw new Error("User data not found in sessionStorage");
      const bytes = CryptoJS.AES.decrypt(storedUser, "");
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      const parsedUser = JSON.parse(decryptedData);

      const userId = parsedUser?.userId || null;
      const role = parsedUser?.userRoles?.[0]?.roleId || null;
      setRoleId(role);
      if (!userId) throw new Error("User ID is not available.");

      setUserId(userId);
      fetchModules(userId);
      fetchPermissions(userId);
    } catch (error) {
      console.error(`Error in initial useEffect:,  ${error}`);
    }
  }, []);

  const fetchModules = async (userId) => {
    try {
      const orgId =
        sessionStorage.getItem("selectedOrgId") ||
        null;
      const response = await fetch("/api/modules", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          ...(orgId ? { orgId } : {}),
        },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setModules(data.navbarModules || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const fetchPermissions = async (userId) => {
    try {
      const orgId =
        sessionStorage.getItem("selectedOrgId") ||
        null;
      const response = await fetch(`/api/permission?userId=${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          ...(orgId ? { orgId } : {}),
        },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPermissions(data.permissionModel || []);
    } catch (error) {
      console.error(`Error fetching permissions:, ${error}`);
    }
  };

  useEffect(() => {
    if (modules.length && permissions.length) {
      const restrictedModuleIds = permissions
        .filter((perm) => perm.privilegeId === 11)
        .map((perm) => perm.moduleId);
      const allowedModuleIds = permissions.map((perm) => perm.moduleId);

      const allowedModules = modules.filter(
        (module) =>
          allowedModuleIds.includes(module.menuSequenceNo) &&
          !restrictedModuleIds.includes(module.menuSequenceNo) &&
          !isWorkspaceModule(module) &&
          module.menuSequenceNo !== 5 && // Excluded — shown in hardcoded Forms & Mapping
          module.menuSequenceNo !== 9 && // Excluded — shown in hardcoded Forms & Mapping
          module.menuSequenceNo !== 2 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 7 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 8 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 10   // Excluded — shown in Reports submenu
      );
      setFilteredModules(allowedModules);

      // Show Forms & Mapping if user has access to module 5 OR 9
      const hasFormsAccess = allowedModuleIds.includes(5) && !restrictedModuleIds.includes(5);
      const hasMappingAccess = allowedModuleIds.includes(9) && !restrictedModuleIds.includes(9);
      setShowHardcodedModule(hasFormsAccess || hasMappingAccess);
      setFormsAccess({ forms: hasFormsAccess, mapping: hasMappingAccess });

      // Show Management if user has access to module 2 OR 7 OR 8
      const hasUsersAccess = allowedModuleIds.includes(2) && !restrictedModuleIds.includes(2);
      const hasRolesAccess = allowedModuleIds.includes(7) && !restrictedModuleIds.includes(7);
      const hasOrgAccess = allowedModuleIds.includes(8) && !restrictedModuleIds.includes(8);
      setShowManagementModule(hasUsersAccess || hasRolesAccess || hasOrgAccess);
      setManagementAccess({ users: hasUsersAccess, roles: hasRolesAccess, org: hasOrgAccess });
      const hasReportsAccess = allowedModuleIds.includes(10) && !restrictedModuleIds.includes(10);
      setReportsAccess(hasReportsAccess);
    }
  }, [modules, permissions]);

  useEffect(() => {
    if (!pathname) return;
    const isOnManagement =
      pathname.startsWith("/dashboard/users") ||
      pathname.startsWith("/dashboard/organization") ||
      pathname.startsWith("/dashboard/roleManagement") ||
      pathname.startsWith("/dashboard/Management_combined_page");
    if (isOnManagement) {
      setOpenManagement(true);
      setOpenForms(false);
      setOpenReports(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnForms =
      pathname.startsWith("/dashboard/forms") ||
      pathname.startsWith("/dashboard/organizationformmapping") ||
      pathname.startsWith("/dashboard/forms-combined");
    if (isOnForms) {
      setOpenForms(true);
      setOpenManagement(false);
      setOpenReports(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnReports =
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/dashboard/reports-combined");
    if (isOnReports) {
      setOpenReports(true);
      setOpenManagement(false);
      setOpenForms(false);
    }
  }, [pathname]);

  const handleModuleClick = () => {
    if (!collapsed && onToggle && window.innerWidth >= 640) {
      onToggle();
    }
    if (onClose && window.innerWidth < 640) {
      onClose();
    }
  };

  const handleDynamicModuleClick = (module) => {
    sessionStorage.setItem("selectedModuleId", module.id);
    handleModuleClick();
  };

  return (
    <TooltipProvider>
      <nav className="flex flex-col items-start gap-3 px-4 sm:py-5" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* ── Helper to render a single dynamic module link ── */}
        {(() => {
          const renderItem = (label, href, iconEl, onClick, isActive, showChevron = false) => {
            if (collapsed) {
              return (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onClick={onClick}
                      className={`flex items-center justify-center w-full px-2 py-2 rounded-md transition-colors ${
                        isActive
                          ? "bg-muted/60 text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {iconEl}
                      <span className="sr-only">{label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                onClick={onClick}
                className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-muted/60 text-brand-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-[16px] w-5 flex items-center justify-center">
                  {iconEl}
                </span>
                <span className="flex-1 truncate">{label}</span>
                {showChevron && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                )}
              </Link>
            );
          };

          const renderDynamicModule = (module) => {
            const isActive = pathname?.startsWith(module.redirectPath);
            return (
              <div key={module.moduleName} className="flex items-center w-full">
                {renderItem(
                  module.moduleName,
                  module.redirectPath,
                  iconMapping[module.menuSequenceNo] || <Home className="h-4 w-4" />,
                  () => handleDynamicModuleClick(module),
                  isActive
                )}
              </div>
            );
          };

          const hardcodedItem = showHardcodedModule ? (
            <div key="forms-mapping-hardcoded" className="w-full">
              {collapsed ? (
                renderItem(
                  HARDCODED_MODULE.moduleName,
                  "/dashboard/forms-combined?tab=forms",
                  HARDCODED_MODULE.icon,
                  handleModuleClick,
                  pathname?.startsWith("/dashboard/forms") ||
                    pathname?.startsWith("/dashboard/organizationformmapping") ||
                    pathname?.startsWith("/dashboard/forms-combined")
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenForms((v) => !v);
                    setOpenManagement(false);
                    setOpenReports(false);
                  }}
                  className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    openForms
                      ? "bg-muted/60 text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[16px] w-5 flex items-center justify-center">
                    {HARDCODED_MODULE.icon}
                  </span>
                  <span className="flex-1 truncate text-left">Form Mangement</span>
                  <ChevronRight
                    className={`h-3 w-3 text-muted-foreground transition-transform ${
                      openForms ? "rotate-90" : ""
                    }`}
                  />
                </button>
              )}

              {!collapsed && openForms && (
                <div className="mt-1 pl-6">
                  {formsAccess.forms && (
                    <Link
                      href="/dashboard/forms-combined?tab=forms"
                      onClick={handleModuleClick}
                      className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                        pathname?.includes("/dashboard/forms")
                          ? "text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: pathname?.includes("/dashboard/forms")
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="truncate">Forms</span>
                    </Link>
                  )}
                  {formsAccess.mapping && (
                    <Link
                      href="/dashboard/forms-combined?tab=mapping"
                      onClick={handleModuleClick}
                      className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                        pathname?.includes("/dashboard/organizationformmapping")
                          ? "text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: pathname?.includes("/dashboard/organizationformmapping")
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="truncate">Organization Mapping</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : null;

          const managementItem = showManagementModule ? (
            <div key="management-hardcoded" className="w-full">
              {collapsed ? (
                renderItem(
                  HARDCODED_MANAGEMENT_MODULE.moduleName,
                  "/dashboard/users",
                  HARDCODED_MANAGEMENT_MODULE.icon,
                  handleModuleClick,
                  pathname?.startsWith("/dashboard/users") ||
                    pathname?.startsWith("/dashboard/organization") ||
                    pathname?.startsWith("/dashboard/roleManagement") ||
                    pathname?.startsWith("/dashboard/Management_combined_page")
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenManagement((v) => !v);
                    setOpenForms(false);
                    setOpenReports(false);
                  }}
                  className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    openManagement
                      ? "bg-muted/60 text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[16px] w-5 flex items-center justify-center">
                    {HARDCODED_MANAGEMENT_MODULE.icon}
                  </span>
                  <span className="flex-1 truncate text-left">User Management</span>
                  <ChevronRight
                    className={`h-3 w-3 text-muted-foreground transition-transform ${
                      openManagement ? "rotate-90" : ""
                    }`}
                  />
                </button>
              )}

              {!collapsed && openManagement && (
                <div className="mt-1 pl-6">
                  {(() => {
                    const items = [
                      managementAccess.users && {
                        label: "Users",
                        href: "/dashboard/users",
                        active: pathname?.startsWith("/dashboard/users"),
                      },
                      managementAccess.roles && {
                        label: "Roles",
                        href: "/dashboard/roleManagement",
                        active: pathname?.startsWith("/dashboard/roleManagement"),
                      },
                      managementAccess.org && {
                        label: "Organisations",
                        href: "/dashboard/organization",
                        active: pathname?.startsWith("/dashboard/organization"),
                      },
                    ].filter(Boolean);

                    return items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleModuleClick}
                        className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                          item.active
                            ? "text-brand-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: item.active
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))",
                          }}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : null;

          const reportsItem = reportsAccess ? (
            <div key="reports-hardcoded" className="w-full">
              {collapsed ? (
                renderItem(
                  "Reports",
                  "/dashboard/reports-combined?tab=interactions",
                  <FileText className="h-4 w-4" />,
                  handleModuleClick,
                  pathname?.startsWith("/dashboard/reports") ||
                    pathname?.startsWith("/dashboard/reports-combined")
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenReports((v) => !v);
                    setOpenManagement(false);
                    setOpenForms(false);
                  }}
                  className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    openReports
                      ? "bg-muted/60 text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[16px] w-5 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate text-left">Reports</span>
                  <ChevronRight
                    className={`h-3 w-3 text-muted-foreground transition-transform ${
                      openReports ? "rotate-90" : ""
                    }`}
                  />
                </button>
              )}

              {!collapsed && openReports && (
                <div className="mt-1 pl-6">
                  {[
                    { key: "interactions", label: "Interactions" },
                    { key: "evaluation", label: "Evaluation" },
                    { key: "user", label: "User" },
                    { key: "audit", label: "Audit" },
                  ].map((tab) => (
                    <Link
                      key={tab.key}
                      href={`/dashboard/reports-combined?tab=${tab.key}`}
                      onClick={handleModuleClick}
                      className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                        pathname?.includes(`/dashboard/reports-combined`) &&
                        new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab") === tab.key
                          ? "text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="truncate">{tab.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null;

          const nameMatch = (m, kw) =>
            String(m?.moduleName || "").toLowerCase().includes(kw);

          const dashboardMods = filteredModules.filter(
            (m) => m.menuSequenceNo === 1 || nameMatch(m, "dashboard")
          );
          const integrationMods = filteredModules.filter((m) =>
            nameMatch(m, "integration")
          );
          const interactionMods = filteredModules.filter((m) =>
            nameMatch(m, "interaction")
          );
          const workflowMods = filteredModules.filter((m) =>
            nameMatch(m, "workflow")
          );

          const picked = new Set([
            ...dashboardMods,
            ...integrationMods,
            ...interactionMods,
            ...workflowMods,
          ]);
          const otherMods = filteredModules.filter((m) => !picked.has(m));

          const ordered = [
            ...dashboardMods,
            ...(managementItem ? [managementItem] : []),
            ...(hardcodedItem ? [hardcodedItem] : []),
            ...integrationMods,
            ...workflowMods,
            ...interactionMods,
            ...(reportsItem ? [reportsItem] : []),
            ...otherMods,
          ];

          return ordered.map((item) =>
            item?.moduleName ? renderDynamicModule(item) : item
          );
        })()}
      </nav>
    </TooltipProvider>
  );
};

export default withAuth(Navbar);

