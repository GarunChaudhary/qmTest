// app/dashboard/users/page.jsx
"use client";
import React, { useEffect, useState, Suspense, useCallback } from "react";
import CryptoJS from "crypto-js";
import { DataTable } from "@/components/dataTable/data-table";
import { userColumns as defaultUserColumns } from "@/components/dataTable/columns";
import { DataTablePagination } from "@/components/dataTable/data-table-pagination";
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions";
import { FaSearch } from "react-icons/fa";
import { notFound } from "next/navigation";
import withAuth from "@/components/withAuth";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
import OrgTreeDropDownReport from "@/components/organizationDDLreport";

const UsersPage = ({ searchParams, basePath = "/dashboard/users" }) => {
  const { search, isActive, page, perPage } = searchParams || {};
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentRoles, setAgentRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState(search || "");
  const [status, setStatus] = useState(isActive || null);
  const [currentPage, setCurrentPage] = useState(Number(page) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(Number(perPage) || 10);
  const [roleFilter, setRoleFilter] = useState(null);
  const [organizationFilter, setOrganizationFilter] = useState(null);
  const [roles, setRoles] = useState([]);
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [selectedUserIdsForDeassociate, setSelectedUserIdsForDeassociate] =
    useState({});
  const [selectedUserIdsForDelete, setSelectedUserIdsForDelete] = useState({});
  const [allowedExportTypes, setAllowedExportTypes] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [selectedRoleOptions, setSelectedRoleOptions] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(null);
  const [deassociateMode, setDeassociateMode] = useState(null);
  const [selectedOrgForAgent, setSelectedOrgForAgent] = useState(null);
  const [dropdownActive, setDropdownActive] = useState(false); // true when user is interacting
  const [deassociateCancelled, setDeassociateCancelled] = useState(false);

  useEffect(() => {
    const storedRoles = sessionStorage.getItem("agentRoles");
    if (storedRoles) {
      try {
        setAgentRoles(JSON.parse(storedRoles));
      } catch (err) {
        console.error("Failed to parse agentRoles", err);
      }
    }
  }, []);

  const hasPrivilege = useCallback(
    (privId) => grantedPrivileges.some((p) => p.PrivilegeId === privId),
    [grantedPrivileges],
  );

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;
        let orgId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
          orgId = user?.organization?.[0]?.orgId || null;
        }

        if (!orgId) {
          const storedOrgId = sessionStorage.getItem("selectedOrgId");
          orgId = storedOrgId ? Number(storedOrgId) : null;
        }

        if (!orgId) {
          throw new Error("Organization not selected");
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 2,
            orgId: orgId,
          },
          cache: "no-store",
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
  const loadRoles = async () => {
    try {
      const response = await fetch("/api/userRoles", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };
  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      loadRoles();
    }
  }, [privilegesLoaded, hasPrivilege]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const response = await fetch("/api/organizationDDL", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch organizations");
        const data = await response.json();
      } catch (err) {
        console.error("Error fetching organizations:", err);
      }
    };
    loadOrganizations();
  }, []);

  // Auto-close filter dropdown after 3 seconds
  useEffect(() => {
    if (activeFilterType && !dropdownActive) {
      const timer = setTimeout(() => {
        setActiveFilterType(null); // auto-close dropdown after 3s idle
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [activeFilterType, dropdownActive]);

  useEffect(() => {
    const hasAgentRole = selectedRoleOptions.some((role) =>
      agentRoles.includes(Number(role.value)),
    );

    // ✅ If Agent is selected again, reset cancellation flag
    if (hasAgentRole) {
      setDeassociateCancelled(false);
    }
  }, [selectedRoleOptions]);

  const getExportTypes = (privileges) => {
    const types = [];
    if (privileges.some((p) => p.PrivilegeId === 4)) types.push("excel");
    if (privileges.some((p) => p.PrivilegeId === 14)) types.push("csv");
    if (privileges.some((p) => p.PrivilegeId === 15)) types.push("pdf");
    return types;
  };

  const fetchUsers = useCallback(
    async (
      triggeredBySearch = false,
      pageNum = currentPage,
      perPageCount = itemsPerPage,
      searchText = searchQuery, // Provide default
    ) => {
      setLoading(true);
      setError(null);
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        let formattedOrganizationFilter = null;
        if (organizationFilter) {
          if (Array.isArray(organizationFilter)) {
            formattedOrganizationFilter = organizationFilter
              .map((item) => {
                if (item && item.value) {
                  const numValue = parseInt(item.value, 10);
                  return !isNaN(numValue) ? numValue : null;
                }
                return null;
              })
              .filter((value) => value !== null)
              .join(",");
          } else if (
            typeof organizationFilter === "object" &&
            organizationFilter.value
          ) {
            const numValue = parseInt(organizationFilter.value, 10);
            formattedOrganizationFilter = !isNaN(numValue)
              ? numValue.toString()
              : null;
          } else if (typeof organizationFilter === "string") {
            const numValue = parseInt(organizationFilter, 10);
            formattedOrganizationFilter = !isNaN(numValue)
              ? numValue.toString()
              : null;
          } else if (typeof organizationFilter === "number") {
            formattedOrganizationFilter = organizationFilter.toString();
          }
        }
        let formattedRoleFilter = null;
        if (roleFilter) {
          if (Array.isArray(roleFilter)) {
            // roleFilter is an array of IDs; join them by comma
            formattedRoleFilter = roleFilter
              .map((id) => {
                const numId = parseInt(id, 10);
                return !isNaN(numId) ? numId : null;
              })
              .filter((id) => id !== null)
              .join(",");
          } else {
            // single role id
            const numId = parseInt(roleFilter, 10);
            formattedRoleFilter = !isNaN(numId) ? numId.toString() : null;
          }
        }

        const requestBody = {
          page: pageNum,
          perPage: perPageCount,
          search: searchText?.trim() || null, // Use searchText here
          queryType: 0,
          currentUserId: userId,
          isActive: status,
          roleFilter: formattedRoleFilter || null,
          organizationFilter: formattedOrganizationFilter || null,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Failed to fetch users");
        const result = await response.json();
        setData(result.users || []);
        setTotalRecords(result.totalRecord || 0);
      } catch (err) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [
      currentPage,
      itemsPerPage,
      searchQuery,
      status,
      roleFilter,
      organizationFilter,
      roles,
    ],
  );

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchUsers(false, currentPage, itemsPerPage);
    }
  }, [
    status,
    currentPage,
    itemsPerPage,
    privilegesLoaded,
    roleFilter,
    organizationFilter,
    hasPrivilege,
  ]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }
  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }
  const handleSearchButtonClick = () => {
    setCurrentPage(1);
    fetchUsers(true, 1, itemsPerPage);
  };

  const handleResetButtonClick = () => {
    setSearchQuery("");
    setStatus(null);
    setRoleFilter(null);
    setOrganizationFilter(null);
    setSelectedRoleOptions([]);
    setActiveFilterType(null);
    setCurrentPage(1);
    setSelectedUserIdsForDelete({});
    setSelectedUserIdsForDeassociate({});
    setDeassociateMode(null); // ✅ Reset organization removal mode
    setSelectedOrgForAgent(null); // ✅ Reset selected organization
    setDeassociateCancelled(false);
    setBulkDeleteMode(false);
    fetchUsers(false, 1, itemsPerPage, "");
  };
  const handleStatusChange = (event) => {
    setStatus(event.target.value || null);
    setCurrentPage(1);
  };
  const handlePageChange = (pageNum, perPage = itemsPerPage) => {
    setCurrentPage(pageNum);
    setItemsPerPage(perPage);
    fetchUsers(false, pageNum, perPage);
  };

  const handleDeassociateSubmit = async () => {
    const selectedUserIds = Object.values(selectedUserIdsForDeassociate).flat();
    const selectedOrgId = selectedOrgForAgent?.value;

    if (!selectedUserIds.length || !selectedOrgId) {
      alert("Please select the new organization, you want to associate.");
      return;
    }

    // 🟡 Confirmation before proceeding
    const confirmDeassoc = confirm(
      `Are you sure you want to de-associate the selected ${
        selectedUserIds.length
      } user${
        selectedUserIds.length > 1 ? "s" : ""
      } from the selected organization?`,
    );
    if (!confirmDeassoc) return;

    const encryptedUserData = sessionStorage.getItem("user");
    let currentUserId = null;
    let user = null;

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        user = JSON.parse(decryptedData);
        currentUserId = user?.userId || null;
      } catch (error) {
        console.error("Failed to decrypt session user:", error);
        alert("User authentication error.");
        return;
      }
    }

    if (!currentUserId) {
      alert("User session expired or invalid.");
      return;
    }

    const payload = {
      OrgId: selectedOrgId,
      UserIds: selectedUserIds.join(","),
      CreatedBy: currentUserId,
    };

    try {
      const response = await fetch("/api/organization/deAssociateOrg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          userName: user?.userFullName, // ✅ ADD THIS
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Organization de-association successful.");
        window.location.reload(); // ✅ reload the page on success
      } else {
        alert(result.message || "De-association failed.");
      }
    } catch (error) {
      console.error("De-association error:", error);
      alert("An unexpected error occurred.");
    }
  };
  const handleToggleAllSelectOrg = (checked) => {
    setSelectedUserIdsForDeassociate((prev) => {
      if (checked) {
        const allIds = data.map((row) => row.userId);
        return { ...prev, [currentPage]: allIds };
      } else {
        return { ...prev, [currentPage]: [] };
      }
    });
  };

  // ✅ Build columns in fixed order
  let userColumns = [
    // all default columns except 'action' and 'deleteSelect'
    ...defaultUserColumns.filter(
      (col) => col.id !== "action" && col.id !== "deleteSelect",
    ),
  ];

  // 🟩 Action column
  if (hasPrivilege(3) || hasPrivilege(5)) {
    userColumns.push({
      id: "action",
      header: () => (
        <div className="flex justify-center text-[10px] font-semibold">
          Action
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="p-1 flex items-center justify-between"
          style={{ fontSize: "10px" }}
        >
          <DataTableRowActions
            row={row}
            tableType="user"
            privileges={{
              canEdit: hasPrivilege(3),
              canDelete: hasPrivilege(5),
            }}
            editBasePath={basePath}
          />
        </div>
      ),
    });
  }

  // 🟥 Delete Checkbox column
  userColumns.push({
    id: "delete",
    header: ({ table }) => {
      const selectedForDelete = table.options.meta?.selectedForDelete || [];
      const allRows = table.getRowModel().rows || [];
      const allIds = allRows.map((r) => r.original.userId);
      const allSelected = allIds.every((id) => selectedForDelete.includes(id));
      const someSelected =
        !allSelected && allIds.some((id) => selectedForDelete.includes(id));

      return (
        <div className="flex items-center space-x-2">
          <span>Delete</span>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) =>
              table.options.meta?.onToggleAllDelete(e.target.checked)
            }
          />
        </div>
      );
    },
    cell: ({ row, table }) => {
      const id = row.original.userId;
      const selectedForDelete = table.options.meta?.selectedForDelete || [];
      const isSelected = selectedForDelete.includes(id);

      return (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) =>
              table.options.meta?.onToggleDelete(id, e.target.checked)
            }
          />
        </div>
      );
    },
  });

  // 🧩 Handles toggle for one checkbox
  const handleToggleDelete = (id, checked) => {
    setSelectedUserIdsForDelete((prev) => {
      const currentPageIds = prev[currentPage] || [];
      let updatedIds;
      if (checked) {
        updatedIds = [...currentPageIds, id];
      } else {
        updatedIds = currentPageIds.filter((x) => x !== id);
      }
      return { ...prev, [currentPage]: updatedIds };
    });
  };

  // 🧩 Handles toggle for "select all" checkbox
  const handleToggleAllDelete = (checked) => {
    setSelectedUserIdsForDelete((prev) => {
      if (checked) {
        // ✅ Select all visible rows on current page
        const allIds = data.map((row) => row.userId);
        return { ...prev, [currentPage]: allIds };
      } else {
        // ❌ Deselect all
        return { ...prev, [currentPage]: [] };
      }
    });
  };

  // Bulk Delete Submit Handler
  const handleBulkDeleteSubmit = async () => {
    const allSelectedIds = Object.values(selectedUserIdsForDelete).flat();
    if (!allSelectedIds.length) {
      alert("Please select users to delete.");
      return;
    }

    // Single confirmation — warn about related data
    const confirmDelete = confirm(
      "On deleting these users, all associated interactions and evaluations will also be permanently deleted.\n\nAre you absolutely sure you want to proceed?",
    );
    if (!confirmDelete) return;

    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let currentUserId = null;
      let user = null; // ✅ ADD THIS

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        user = JSON.parse(decryptedData); // ✅ assign to outer variable
        currentUserId = user?.userId || null;
      }

      const response = await fetch("/api/users/delete/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          userName: user?.userFullName, // ✅ add this
        },
        body: JSON.stringify({ userIds: allSelectedIds, currentUserId }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Users deleted successfully.");
        setSelectedUserIdsForDelete({});
        window.location.reload(); // Force reload on success
      } else {
        alert(result.message || "Delete failed.");
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Error deleting users.");
    }
  };

  return (
    <div className="p-4 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Search Field + Icon */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search User"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchButtonClick()}
              className="pr-8 pl-2 py-1 border border-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-80"
            />
            <FaSearch
              className="absolute right-2 top-1.5 text-muted-foreground w-3.5 h-3.5 cursor-pointer"
              onClick={handleSearchButtonClick}
              title="Search"
            />
          </div>

          <select
            className="w-[160px] px-3 py-1 border border-border bg-background text-foreground text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            value={activeFilterType || ""}
            onChange={(e) => setActiveFilterType(e.target.value || null)}
          >
            <option value="">Select Filter</option>
            <option value="status">User Status</option>
            <option value="organization">Organization</option>
            <option value="roles">Roles</option>
          </select>

          {selectedRoleOptions.some((role) =>
            agentRoles.includes(Number(role.value)),
          ) &&
            hasPrivilege(25) &&
            deassociateMode !== "organization" &&
            !deassociateCancelled && ( // 👈 Hide only if cancelled
              <button
                type="button"
                onClick={() => {
                  setDeassociateMode("organization");
                  setSelectedUserIdsForDeassociate({});
                  setDeassociateCancelled(false); // reset if re-activated
                }}
                className="bg-red-500 text-white text-xs px-4 py-1 rounded-md hover:bg-red-600"
              >
                De-associate Organization
              </button>
            )}

          {deassociateMode === "organization" && (
            <button
              className="bg-gray-400 text-white text-xs px-4 py-1 rounded-md hover:bg-gray-600"
              onClick={() => {
                setDeassociateMode(null);
                setSelectedUserIdsForDeassociate({});
                setDeassociateCancelled(true); // ✅ Mark as cancelled
              }}
            >
              Cancel De-association
            </button>
          )}

          {deassociateMode === "organization" &&
            Object.values(selectedUserIdsForDeassociate).flat().length > 0 && (
              <>
                <div className="max-w-[200px]">
                  <TreeDropdown
                    selected={selectedOrgForAgent}
                    onChange={setSelectedOrgForAgent}
                    isMulti={false}
                  />
                </div>
                <button
                  className="bg-[#B33F40] hover:bg-[var(--brand-secondary)] text-white px-4 py-1 text-xs rounded-md"
                  onClick={handleDeassociateSubmit}
                >
                  Confirm Association
                </button>
              </>
            )}

          <button
            type="button"
            onClick={handleResetButtonClick}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-xs px-4 py-1 rounded-md"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-4">
        {activeFilterType === "status" && (
          <select
            value={status || ""}
            onChange={handleStatusChange}
            onFocus={() => setDropdownActive(true)}
            onBlur={() => setDropdownActive(false)}
            className="w-full max-w-xs px-3 py-1 border border-border bg-background text-foreground text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="">Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        )}

        {activeFilterType === "roles" && (
          <div
            className="w-full max-w-xs"
            onMouseEnter={() => setDropdownActive(true)}
            onMouseLeave={() => setDropdownActive(false)}
          >
            <RoleMultiSelect
              roles={roles}
              selectedRoles={selectedRoleOptions}
              onChange={(selected) => {
                setSelectedRoleOptions(selected);
                setRoleFilter(selected.map((r) => r.value));
                setCurrentPage(1);
              }}
              error={null}
              enforceAgentExclusivity={false}
            />
          </div>
        )}

        {activeFilterType === "organization" && (
          <div
            className="w-full max-w-xs"
            onMouseEnter={() => setDropdownActive(true)}
            onMouseLeave={() => setDropdownActive(false)}
          >
            <OrgTreeDropDownReport
              selected={organizationFilter}
              onChange={(selected) => {
                setOrganizationFilter(selected);
                setCurrentPage(1);
              }}
              isMulti={true}
            />
          </div>
        )}

        {/* Selected Filters Summary */}
        {(status ||
          selectedRoleOptions.length > 0 ||
          (organizationFilter && organizationFilter.length > 0)) && (
          <div className="flex flex-col gap-1 mt-2 text-xs">
            {/* Status */}
            {status && (
              <span>Status: {status === "1" ? "Active" : "Inactive"}</span>
            )}

            {/* Roles */}
            {selectedRoleOptions.length > 0 && (
              <span className="flex items-center gap-1">
                Roles:{" "}
                {selectedRoleOptions
                  .slice(0, 3)
                  .map((r) => r.label)
                  .join(", ")}
                {selectedRoleOptions.length > 3 && (
                  <button
                    type="button"
                    className="underline text-primary hover:text-blue-800 ml-1"
                    onClick={() => setActiveFilterType("roles")}
                  >
                    +{selectedRoleOptions.length - 3} more
                  </button>
                )}
              </span>
            )}

            {/* Organizations */}
            {organizationFilter && organizationFilter.length > 0 && (
              <span className="flex items-center gap-1 cursor-pointer">
                Organizations:{" "}
                {Array.isArray(organizationFilter)
                  ? organizationFilter
                      .slice(0, 3)
                      .map((org) => org.label)
                      .join(", ")
                  : organizationFilter.label || organizationFilter}
                {Array.isArray(organizationFilter) &&
                  organizationFilter.length > 3 && (
                    <button
                      type="button"
                      className="underline text-primary hover:text-blue-800 ml-1"
                      onClick={() => setActiveFilterType("organization")}
                    >
                      +{organizationFilter.length - 3} more
                    </button>
                  )}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {loading ? (
            <p className="text-xs">Loading...</p>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <Suspense fallback={<div className="text-xs">Loading...</div>}>
              {hasPrivilege(1) ? (
                <>
                  <DataTable
                    data={data}
                    columns={userColumns}
                    loading={loading}
                    selectableRows={!!deassociateMode}
                    selectedRowIds={
                      selectedUserIdsForDeassociate[currentPage] || []
                    }
                    onSelectedRowIdsChange={(ids) => {
                      setSelectedUserIdsForDeassociate((prev) => ({
                        ...prev,
                        [currentPage]: ids,
                      }));
                    }}
                    tableMeta={{
                      selectedForDelete: Object.values(
                        selectedUserIdsForDelete,
                      ).flat(),
                      onToggleDelete: handleToggleDelete,
                      onToggleAllDelete: handleToggleAllDelete,
                      onBulkDelete: handleBulkDeleteSubmit,
                      onToggleAllSelectOrg: handleToggleAllSelectOrg,
                      grantedPrivileges, // ✅ pass privileges here
                    }}
                    rowClickSelection={false}
                    showCreateBtn={hasPrivilege(2)}
                    exportType={"Users"}
                    allowedExportTypes={allowedExportTypes}
                    createBasePath={basePath}
                    exportStatus={status}
                    exportSearch={searchQuery}
                    exportRoleFilter={roleFilter}
                    exportOrganizationFilter={organizationFilter}
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
                <p className="text-xs">Loading...</p>
              )}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};
export default withAuth(UsersPage);

