"use client";
import { useState, useEffect, useRef } from "react";
import CryptoJS from "crypto-js";
import {
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
} from "react-icons/hi";

export default function FilteredUsersForm() {
  const [usersData, setUsersData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filters, setFilters] = useState({
    roleName: "",
    orgName: "",
    isActive: "",
    fromDate: "",
    toDate: "",
    search: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage] = useState(7); // 5 items per page
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const tableContainerRef = useRef(null);
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  const fetchFilteredData = async () => {
    setLoading(true);
    setError(null);

    let userId = null;
    const encryptedUserData = sessionStorage.getItem("user");

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
      }
    }

    if (!userId) {
      setLoading(false);
      setError("User ID not found. Please log in again.");
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `/api/dashBoard1/usersM/getFilteredUsers?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userId,
          },
          cache: "no-store",
        }
      );

      const textResponse = await response.text();
      if (!textResponse) {
        setError("Empty response from server. Please try again.");
        return;
      }

      const data = JSON.parse(textResponse);

      if (response.ok && data?.data) {
        setUsersData(data.data.users || []);
        setRoles(data.data.roles || []);
        setOrganizations(data.data.organizations || []);
      } else {
        throw new Error(
          data.message || "Failed to fetch data. Please check your connection."
        );
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFilteredData();
  };

  const handleReset = () => {
    setFilters({
      roleName: "",
      orgName: "",
      isActive: "",
      fromDate: "",
      toDate: "",
      search: "",
    });
    setCurrentPage(1);
    fetchFilteredData();
  };

  // Sorting logic
  const handleSort = (field) => {
    const updatedOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    const sorted = [...usersData].sort((a, b) => {
      const valA = a[field] || "";
      const valB = b[field] || "";
      return updatedOrder === "asc"
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
    setUsersData(sorted);
    setSortField(field);
    setSortOrder(updatedOrder);
  };

  // Convert API dates to Date objects once
  // Only apply search locally; no date/role/org filter here
  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      !filters.search ||
      user.user_full_name?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesRole =
      !filters.roleName || user.user_roles === filters.roleName;

    const matchesOrg =
      !filters.orgName || user.organizations === filters.orgName;

    const matchesStatus =
      !filters.isActive || user.is_active === filters.isActive;

    const from = filters.fromDate ? new Date(filters.fromDate) : null;
    const to = filters.toDate ? new Date(filters.toDate) : null;
    const createdOn = user.created_on ? new Date(user.created_on) : null;

    const matchesDate =
      (!from || (createdOn && createdOn >= from)) &&
      (!to || (createdOn && createdOn <= to));

    return (
      matchesSearch && matchesRole && matchesOrg && matchesStatus && matchesDate
    );
  });

  useEffect(() => {
    if (!tableContainerRef.current) return;

    const updateRows = () => {
      const container = tableContainerRef.current;
      if (!container || filteredUsers.length === 0) return;

      const height = container.offsetHeight;
      if (height < 300) return;

      const baseHeader = showFilters ? 320 : 180;
      const paginationHeight = filteredUsers.length > 10 ? 80 : 30;
      const availableHeight = height - baseHeader - paginationHeight;
      const rowHeight = 38;

      const maxPossible = Math.floor(availableHeight / rowHeight);
      const totalAvailable = filteredUsers.length;

      let idealRows = Math.min(maxPossible, totalAvailable);
      idealRows = Math.max(10, idealRows); // minimum 10

      if (idealRows !== itemsPerPage) {
        setItemsPerPage(idealRows);
        setCurrentPage(1);
      }
    };

    updateRows();
    setTimeout(updateRows, 100);
    setTimeout(updateRows, 500);

    const observer = new ResizeObserver(updateRows);
    observer.observe(tableContainerRef.current);
    window.addEventListener("resize", updateRows);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRows);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilters, filteredUsers.length]);

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getStatusStyle = (isActive) => {
    const base =
      "inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold";
    return isActive
      ? `${base} bg-green-100 text-green-800`
      : `${base} bg-red-100 text-red-800`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white shadow-md rounded-lg p-4 border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0 widget-drag-handle cursor-move select-none">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          User Management
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiOutlineSearch className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search users..."
              className="block w-full pl-8 pr-2 py-1.5 border border-border rounded-lg bg-card shadow-sm text-xs text-muted-foreground focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <HiOutlineFilter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="p-3 bg-muted border border-border rounded-lg mb-4 flex-shrink-0">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <div>
              <label
                htmlFor="roleName"
                className="block text-xs font-medium text-foreground mb-0.5"
              >
                Role
              </label>
              <select
                id="roleName"
                name="roleName"
                value={filters.roleName}
                onChange={handleChange}
                className="w-full p-1.5 border border-border rounded-lg bg-card shadow-sm text-xs focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
              >
                <option value="">All Roles</option>
                {roles.map((role, index) => (
                  <option key={index} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="orgName"
                className="block text-xs font-medium text-foreground mb-0.5"
              >
                Organization
              </label>
              <select
                id="orgName"
                name="orgName"
                value={filters.orgName}
                onChange={handleChange}
                className="w-full p-1.5 border border-border rounded-lg bg-card shadow-sm text-xs focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
              >
                <option value="">All Organizations</option>
                {organizations.map((org, index) => (
                  <option key={index} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="isActive"
                className="block text-xs font-medium text-foreground mb-0.5"
              >
                Status
              </label>
              <select
                id="isActive"
                name="isActive"
                value={filters.isActive}
                onChange={handleChange}
                className="w-full p-1.5 border border-border rounded-lg bg-card shadow-sm text-xs focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-0.5">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="fromDate"
                  value={filters.fromDate}
                  onChange={handleChange}
                  className="p-1.5 border border-border rounded-lg bg-card shadow-sm text-xs focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
                />
                <input
                  type="date"
                  name="toDate"
                  value={filters.toDate}
                  onChange={handleChange}
                  className="p-1.5 border border-border rounded-lg bg-card shadow-sm text-xs focus:ring-2 focus:ring-ring transition-all hover:bg-muted"
                />
              </div>
            </div>
            <div className="flex gap-2 lg:col-span-4 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground bg-card hover:bg-muted transition-all"
              >
                <HiOutlineRefresh className="mr-1 h-3.5 w-3.5 inline" /> Reset
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-primary transition-all"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading, Error, and Users Table */}
      <div ref={tableContainerRef} className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading users...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-destructive text-sm font-medium">
            Error: {error}
          </div>
        ) : (
          <>
            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-blue-100 text-blue-900 text-left sticky top-0 z-10">
                      {[
                        { label: "#", key: "index" },
                        { label: "Name", key: "user_full_name" },
                        { label: "Role", key: "user_role" },
                        { label: "Organization", key: "org_name" },
                        { label: "Status", key: "is_active" },
                        { label: "Created On", key: "created_on" },
                        { label: "Created By", key: "created_by" },
                        { label: "Modified On", key: "modified_on" },
                        { label: "Modified By", key: "modify_by" },
                      ].map(({ label, key }) => (
                        <th
                          key={key}
                          onClick={
                            key !== "index" ? () => handleSort(key) : null
                          }
                          className={`px-3 py-2 ${
                            key !== "index"
                              ? "cursor-pointer hover:bg-blue-200"
                              : ""
                          } whitespace-nowrap tracking-wider`}
                        >
                          <div className="flex items-center gap-0.5">
                            {label}
                            {sortField === key && key !== "index" && (
                              <span>{sortOrder === "asc" ? "Up" : "Down"}</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          No users match your current filters.
                        </td>
                      </tr>
                    ) : (
                      currentUsers.map((user, idx) => (
                        <tr
                          key={idx}
                          className={`${
                            idx % 2 === 0 ? "bg-card" : "bg-muted"
                          } transition-all hover:bg-muted`}
                        >
                          <td className="px-3 py-2 text-foreground">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="px-3 py-2 text-foreground font-medium truncate max-w-[200px]">
                            {user.user_full_name}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {user.user_roles}
                          </td>
                          <td className="px-3 py-2 text-foreground truncate max-w-[120px]">
                            {user.organizations}
                          </td>
                          <td className="px-3 py-2">
                            <span className={getStatusStyle(user.is_active)}>
                              {user.is_active}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">
                            {user.created_on
                              ? new Date(user.created_on).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {user.created_by}
                          </td>
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">
                            {user.modified_on
                              ? new Date(user.modified_on).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {user.modify_by || "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination - always at bottom */}
            {filteredUsers.length > itemsPerPage && (
              <div className="mt-3 pt-3 border-t border-border flex-shrink-0">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-xs text-muted-foreground">
                    Showing {indexOfFirstUser + 1} to{" "}
                    {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
                    {filteredUsers.length} users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => paginate(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-blue-100 disabled:bg-secondary disabled:text-muted-foreground transition-all duration-200"
                    >
                      <HiOutlineChevronDoubleLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-blue-100 disabled:bg-secondary disabled:text-muted-foreground transition-all duration-200"
                    >
                      <HiOutlineChevronLeft className="h-4 w-4" />
                    </button>
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-blue-100"
                        } transition-all duration-200`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-blue-100 disabled:bg-secondary disabled:text-muted-foreground transition-all duration-200"
                    >
                      <HiOutlineChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => paginate(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-blue-100 disabled:bg-secondary disabled:text-muted-foreground transition-all duration-200"
                    >
                      <HiOutlineChevronDoubleRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

