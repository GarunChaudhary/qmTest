"use client";
import React, { useEffect, useState, Suspense, useCallback } from "react";
import CryptoJS from "crypto-js";
import { DataTable } from "@/components/dataTable/data-table";
import { agentOrganizationColumns as defaultOrganizationColumns } from "@/components/dataTable/columns";
import { DataTablePagination } from "@/components/dataTable/data-table-pagination";
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions";
import withAuth from "@/components/withAuth";
import { FaSearch } from "react-icons/fa";
import { notFound } from "next/navigation";
// import AgentDDL from "@/components/agentDDL";

const AgentOrganizationPage = ({ searchParams }) => {
  const { search, page, perPage } = searchParams || {};
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(search || "");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(page ? Number(page) : 1);
  const [itemsPerPage, setItemsPerPage] = useState(
    perPage ? Number(perPage) : 10
  );
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [allowedExportTypes, setAllowedExportTypes] = useState([]);

  const hasPrivilege = useCallback(
    (privId) => grantedPrivileges.some((p) => p.PrivilegeId === privId),
    [grantedPrivileges]
  );

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 4, 
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setGrantedPrivileges(data.privileges || []);
        setAllowedExportTypes(getExportTypes(data.privileges || []));
        setPrivilegesLoaded(true);
      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true);
      }
    };

    fetchPrivileges();
  }, []);

  const getExportTypes = (privileges) => {
    const types = [];
    if (privileges.some((p) => p.PrivilegeId === 4)) types.push("excel");
    if (privileges.some((p) => p.PrivilegeId === 14)) types.push("csv");
    if (privileges.some((p) => p.PrivilegeId === 15)) types.push("pdf");
    return types;
  };

  const fetchAgentOrganization = useCallback(
    async (
      triggeredBySearch = false,
      pageNum = currentPage,
      perPage = itemsPerPage
    ) => {
      setLoading(true);
      setError(null);

      try {
        const encryptedUserData = sessionStorage.getItem("user");

        let currentUserId = null;
        if (encryptedUserData) {
          try {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            const user = JSON.parse(decryptedData);
            currentUserId = user?.userId || null;
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }
        const response = await fetch("/api/agentorganization", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: currentUserId,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },

          body: JSON.stringify({
            search: triggeredBySearch ? searchQuery : "",
            queryType: 0,
            page: pageNum,
            perPage: perPage,
            currentUserId,
          }),
          cache: "no-store",
        });

        if (!response.ok)
          throw new Error("Failed to fetch agent organization.");

        const result = await response.json();

        setData(result.mappings || []);
        setTotalRecords(result.totalRecord || 0);
      } catch (err) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    },

    [currentPage, itemsPerPage, searchQuery]
  );

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchAgentOrganization(isSearchMode, currentPage, itemsPerPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, privilegesLoaded, isSearchMode, hasPrivilege]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  const agentOrganizationColumns = [
    ...defaultOrganizationColumns.filter((column) => column.id !== "action"),
    ...(hasPrivilege(3) || hasPrivilege(5)
      ? [
          {
            id: "action",
            cell: ({ row }) => (
              <DataTableRowActions
                row={row}
                tableType="agentOrganization"
                privileges={{
                  canEdit: hasPrivilege(3),
                  canDelete: hasPrivilege(5),
                }}
              />
            ),
          },
        ]
      : []),
  ];

  const handleSearchButtonClick = () => {
    setIsSearchMode(true);
    setCurrentPage(1);
    fetchAgentOrganization(true);
  };

  const handleResetButtonClick = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNum, perPage = itemsPerPage) => {
    setCurrentPage(pageNum);
    setItemsPerPage(perPage);
    fetchAgentOrganization(isSearchMode, pageNum, perPage);
  };

  const handleSearchInputChange = (e) => setSearchQuery(e.target.value);

  return (
    <div className="p-4">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search Agent Organization"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchButtonClick();
            }}
            className="pr-8 pl-2 py-1 border border-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-80"
          />
          <FaSearch
            className="absolute right-2 top-1.5 text-muted-foreground w-3.5 h-3.5 cursor-pointer"
            onClick={handleSearchButtonClick}
            title="Search"
          />
        </div>

        <button
          type="button"
          onClick={handleResetButtonClick}
          className=" bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-xs px-4 py-1 rounded-lg hover:bg-gray-700 transition-all flex items-center"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <p className="text-xs">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-xs">{error}</p>
      ) : (
        <Suspense fallback={<div className="text-xs">Loading...</div>}>
          {hasPrivilege(1) ? (
            <>
              <DataTable
                data={data}
                columns={agentOrganizationColumns}
                loading={loading}
                showCreateBtn={hasPrivilege(2)}
                exportType={"AgentOrganization"}
                pageType={"AgentOrganization"}
                allowedExportTypes={allowedExportTypes}
                exportSearch={searchQuery}
              />
              {totalRecords > 0 && (
                <DataTablePagination
                  totalRecords={totalRecords}
                  currentPageNum={currentPage}
                  itemsPerPage={itemsPerPage}
                  loading={loading}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <p>Loading...</p>
          )}
        </Suspense>
      )}
    </div>
  );
};

export default withAuth(AgentOrganizationPage);


