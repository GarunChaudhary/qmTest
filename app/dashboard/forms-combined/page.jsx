"use client";

import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import withAuth from "@/components/withAuth";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { FileText, GitMerge } from "lucide-react";
import FormsPage from "@/app/dashboard/forms/page";
import OrganizationFormMappingPage from "@/app/dashboard/organizationformmapping/page";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }
`;

// ─── Utility ─────────────────────────────────────────────────────────────────
const getUserFromSession = () => {
  if (typeof window === "undefined") return null;
  const encryptedUserData = sessionStorage.getItem("user");
  if (!encryptedUserData) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};

// ─── Tab skeleton ─────────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-gray-200/60 rounded-lg">
          {[72, 120].map((w, i) => (
            <div key={i} className="h-7 rounded-md bg-gray-300/50" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TAB_META = [
  { key: "forms",   label: "Forms",               icon: FileText  },
  { key: "mapping", label: "Organization Mapping", icon: GitMerge  },
];

// ─── Main Combined Page ───────────────────────────────────────────────────────
function FormsAndMappingPage() {
  const [activeTab, setActiveTab]             = useState(null);
  const [formsPrivileges, setFormsPrivileges] = useState([]);
  const [mappingPrivileges, setMappingPrivileges] = useState([]);
  const [formsPrivLoaded, setFormsPrivLoaded]     = useState(false);
  const [mappingPrivLoaded, setMappingPrivLoaded] = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();

  const hasFormsAccess   = formsPrivileges.some((p) => p.PrivilegeId === 1);
  const hasMappingAccess = mappingPrivileges.some((p) => p.PrivilegeId === 1);

  // Fetch Forms privileges (moduleId: 5)
  useEffect(() => {
    const fetchFormsPrivileges = async () => {
      try {
        const user   = getUserFromSession();
        const userId = user?.userId ?? null;
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        sessionStorage.setItem("formsReturnTo", "/dashboard/forms-combined?tab=forms");

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 5,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch forms privileges");
        const data = await response.json();
        setFormsPrivileges(data.privileges || []);
      } catch (err) {
        console.error("Error fetching forms privileges:", err);
      } finally {
        setFormsPrivLoaded(true);
      }
    };
    fetchFormsPrivileges();
  }, []);

  // Fetch Mapping privileges (moduleId: 9)
  useEffect(() => {
    const fetchMappingPrivileges = async () => {
      try {
        const user   = getUserFromSession();
        const userId = user?.userId ?? null;

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 9,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch mapping privileges");
        const data = await response.json();
        setMappingPrivileges(data.privileges || []);
      } catch (err) {
        console.error("Error fetching mapping privileges:", err);
      } finally {
        setMappingPrivLoaded(true);
      }
    };
    fetchMappingPrivileges();
  }, []);

  // Resolve active tab from URL or first accessible
  useEffect(() => {
    if (!formsPrivLoaded || !mappingPrivLoaded) return;

    const requestedTab = searchParams?.get("tab");
    const allowed = TAB_META
      .filter((t) =>
        (t.key === "forms"   && hasFormsAccess) ||
        (t.key === "mapping" && hasMappingAccess)
      )
      .map((t) => t.key);

    const nextTab = allowed.includes(requestedTab) ? requestedTab : allowed[0];
    if (!nextTab) return;

    if (activeTab !== nextTab) setActiveTab(nextTab);
    if (requestedTab !== nextTab) {
      router.replace(`/dashboard/forms-combined?tab=${nextTab}`);
    }
  }, [formsPrivLoaded, mappingPrivLoaded, hasFormsAccess, hasMappingAccess, activeTab, searchParams, router]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    router.replace(`/dashboard/forms-combined?tab=${key}`);
  };

  const bothLoaded = formsPrivLoaded && mappingPrivLoaded;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!bothLoaded) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
        <div className="space-y-4">
          {/* page header skeleton */}
          <div className="animate-pulse">
            <div className="h-3 w-36 bg-gray-100 rounded mb-1.5" />
            <div className="h-2.5 w-56 bg-gray-100 rounded" />
          </div>
          <TabSkeleton />
        </div>
      </>
    );
  }

  if (!hasFormsAccess && !hasMappingAccess) return notFound();

  const visibleTabs = TAB_META.filter((t) =>
    (t.key === "forms"   && hasFormsAccess) ||
    (t.key === "mapping" && hasMappingAccess)
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      <div className="space-y-4">
        {/* ── TAB BAR + CONTENT CARD ───────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {activeTab === "mapping" ? "Organization Mapping" : "Forms"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {activeTab === "mapping"
                ? "Manage organization to form access"
                : "Manage forms and related actions"}
            </p>
          </div>

          {/* Tab content */}
          <div role="tabpanel" className="p-5">
            {activeTab === "forms"   && hasFormsAccess   && (
              <FormsPage basePath="/dashboard/forms-combined?tab=forms" />
            )}
            {activeTab === "mapping" && hasMappingAccess && <OrganizationFormMappingPage />}
          </div>

        </div>
      </div>
    </>
  );
}

export default withAuth(FormsAndMappingPage);
