// app/dashboard/interactions/page.jsx
"use client";
import CryptoJS from "crypto-js";
import { X } from "lucide-react";
import React, { Suspense } from "react";
import { FaSearch } from "react-icons/fa";
// import { BiSolidHelpCircle } from "react-icons/bi";
import { HiMiniInformationCircle } from "react-icons/hi2";
import { notFound } from "next/navigation";
import AgentDDL from "@/components/agentDDL";
import withAuth from "@/components/withAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Select, { components } from "react-select";
import { DataTable } from "@/components/dataTable/data-table";
import DatePickerWithRange from "@/components/date-range-picker";
import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/dataTable/data-table-pagination";
import FormDDLForReport from "@/components/formDDL";
import EvaluatorDDL from "@/components/evaluatorDDL";
import {
  interactionColumns as defaultInteractionColumns,
  evaluationColumns as defaultEvaluationsColumns,
} from "@/components/dataTable/columns";

const filterLabels = {
  callId: "Call ID",
  ucid: "UCID",
  extensions: "Extension",
  organizationName: "Organization",
  agent: "Agent",
  agentName: "Agent Name",
  formIds: "Form Name",
  evaluatorIds: "Evaluator Name",
  callDuration: "Call Duration", // ⭐ NEW
  // aniDni: "Ani/Dnis", // ⭐ NEW
  aniDni: "ANI/DNIS", // was "Ani/Dnis"
};
const filterTitles = {
  // aniDni: "Ani/Dnis",
  aniDni: "ANI/DNIS", // was "Ani/Dnis"
};
const filterPlaceholders = {
  // aniDni: "Enter Ani/Dnis",
  aniDni: "Enter ANI/DNIS", // was "Enter Ani/Dnis"
};

const SELECT_ALL_OPTION = {
  value: "__all__",
  label: "Select All",
};

function flattenTreeToGroups(tree) {
  const groups = [];

  const traverse = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      groups.push({
        value: node.id || node.organizationId,

        label: `${" ".repeat(depth * 2)}${node.organizationName || node.name}`,

        isDisabled: !node.isActive,
      });

      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  };

  traverse(tree);
  return groups;
}

function getAllDescendants(node) {
  let result = [{ value: node.id, label: node.name }];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      result = result.concat(getAllDescendants(child));
    }
  }
  return result;
}

function findNodeById(tree, id) {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Custom styles for the tree dropdown
const customStyles = {
  option: (provided, { data, isDisabled, isFocused }) => ({
    ...provided,
    paddingLeft: `${data.label?.split(" ").length * 10 || 10}px`,
    padding: "8px 12px",
    fontSize: "0.75rem",
    color: isDisabled
      ? "hsl(var(--muted-foreground))"
      : "hsl(var(--foreground))",
    backgroundColor: "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    ":hover": {
      backgroundColor: "transparent",
      color: "hsl(var(--primary))",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: 300,
  }),
  control: (provided) => ({
    ...provided,
    borderColor: "hsl(var(--border))",
    boxShadow: "none",
    borderRadius: "0.275rem", // Rounded corners
    minHeight: "34px", // Sets a smaller minimum height
    height: "34px", // Explicitly sets a smaller height
    "&:hover": {
      borderColor: "hsl(var(--ring))",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
    color: "hsl(var(--muted-foreground))",
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "hsl(var(--muted))",
    color: "hsl(var(--foreground))",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    ":hover": {
      backgroundColor: "hsl(var(--destructive))",
      color: "white",
    },
  }),
};

const interactionDefaultVisibility = {
  id: false,
  callId: false,
  agentId: false,
  ucid: false,
  localStartTime: false,
  localEndTime: false,
  sid: false,
  extension: false,
  audioModuleNo: false,
  audioChannelNo: false,
  noOfHolds: false,
  pbxLoginId: false,
  screenExists: false,
  screenModule: false,
  switchId: false,
  switchName: false,
  // ✅ These 8 remain VISIBLE (not listed = visible by default):
  // personalName, audioStartTime, audioEndTime, organizationName,
  // direction, duration, ani, dnis
};

const InteractionPage = () => {
  const [count, setCount] = useState(0);
  const organizationTreeRaw = useRef([]);
  const abortControllerRef = useRef(null);
  const preDateFilterRange = useRef(null); // ⭐ saves date range before ignore-date filter expands it
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [interactions, setInteractions] = useState([]);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [draftColumnFilters, setDraftColumnFilters] = useState({});
  const [hasSearched, setHasSearched] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [lastDownloadCount, setLastDownloadCount] = useState(0);
  const [agentNameOptions, setAgentNameOptions] = useState([]);
  const [filtersPending, setFiltersPending] = useState(false);
  // const [durationBuckets, setDurationBuckets] = useState([]);
  const [durationOperator, setDurationOperator] = useState(">");
  const [durationValue, setDurationValue] = useState("");
  const [durationValue2, setDurationValue2] = useState(""); // ⭐ for "between"
  const [columnVisibility, setColumnVisibility] = useState(
    interactionDefaultVisibility,
  );
  // const [selectedDurationBucket, setSelectedDurationBucket] = useState([]);
  const [confirmDownloadOpen, setConfirmDownloadOpen] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadSuccessOpen, setDownloadSuccessOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const [selectedInteractionIds, setSelectedInteractionIds] = useState({});
  const [modalSearchValue, setModalSearchValue] = useState("");
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [columnSearchValues, setColumnSearchValues] = useState({});
  const [allowedExportTypes, setAllowedExportTypes] = useState([]);
  const [tempSelectedOptions, setTempSelectedOptions] = useState([]);
  const [selectedRowsMap, setSelectedRowsMap] = useState({});
  const [tableKey, setTableKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [organizationTreeOptions, setOrganizationTreeOptions] = useState([]);
  const [selectedDropdownOptions, setSelectedDropdownOptions] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [status, setStatus] = useState(null);
  const [formOptions, setFormOptions] = useState([]);
  const [evaluatorOptions, setEvaluatorOptions] = useState([]);

  const resetSelections = () => {
    setSelectedInteractionIds({});
    setSelectedRowsMap({});
    setTableKey((prev) => prev + 1);
  };

  const hasPrivilege = (privId) =>
    grantedPrivileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
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
            moduleId: 6, // Users module
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
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

        const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
        let timezone = null;
        if (encryptedTimezone) {
          const tzBytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          timezone = JSON.parse(tzBytes.toString(CryptoJS.enc.Utf8));
        }

        const res = await fetch("/api/interactions/searchHistory", {
          headers: { loggedInUserId: user.userId, timezone: timezone },
        });
        const data = await res.json();
        setSearchHistory(data.history || []);
      } catch (_) {
        // Ignore search history load failures.
      }
    };

    fetchHistory();
  }, []);

  // useEffect(() => {
  //   const fetchBuckets = async () => {
  //     const res = await fetch("/api/durationBuckets");
  //     const data = await res.json();

  //     const formatted = data.buckets.map((b) => ({
  //       value: b.BucketId,
  //       label: b.BucketName,
  //     }));

  //     setDurationBuckets(formatted);
  //   };

  //   fetchBuckets();
  // }, []);

  const getExportTypes = (privileges) => {
    const types = [];
    if (privileges.some((p) => p.PrivilegeId === 4)) types.push("excel");
    if (privileges.some((p) => p.PrivilegeId === 14)) types.push("csv");
    if (privileges.some((p) => p.PrivilegeId === 15)) types.push("pdf");
    return types;
  };

  // ⭐ ADD THIS
  const handleToggleAllSelectInteractions = (checked) => {
    setSelectedInteractionIds((prev) => {
      if (checked) {
        const allIds = interactions.map(
          (row) => row.interactionId || row.callId,
        );
        return { ...prev, [currentPage]: allIds };
      } else {
        return { ...prev, [currentPage]: [] };
      }
    });
  };

  const handleOrganizationChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setTempSelectedOptions([]);
      return;
    }

    const currentIds = tempSelectedOptions.map((opt) => opt.value);
    const selectedIds = selectedOptions.map((opt) => opt.value);

    const added = selectedOptions.filter(
      (opt) => !currentIds.includes(opt.value),
    );
    const removed = tempSelectedOptions.filter(
      (opt) => !selectedIds.includes(opt.value),
    );

    // Check if adding or removing
    if (added.length > 0) {
      const last = added[added.length - 1];
      const node = findNodeById(organizationTreeRaw.current, last.value);
      if (!node) return;

      const newNodes = getAllDescendants(node);
      const combined = [...tempSelectedOptions, ...newNodes];
      const unique = Array.from(
        new Map(combined.map((o) => [o.value, o])).values(),
      );

      setTempSelectedOptions(unique);
    } else if (removed.length > 0) {
      // If removing, remove the node and all its descendants
      const toRemove = removed[0];
      const node = findNodeById(organizationTreeRaw.current, toRemove.value);
      if (!node) return;

      const nodesToRemove = getAllDescendants(node).map((n) => n.value);
      const filtered = tempSelectedOptions.filter(
        (opt) => !nodesToRemove.includes(opt.value),
      );
      setTempSelectedOptions(filtered);
    }
  };

  const interactionColumns = defaultInteractionColumns.filter(
    (column) => column.id !== "action",
  );
  // ✅ ADD THIS — defines which columns are visible by default for interactions

  const evaluationsColumns = defaultEvaluationsColumns.filter(
    (column) => column.id !== "action",
  );
  const fetchOrganizationTree = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let userId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: userId,
      };

      const response = await fetch("/api/interactions/organizationDDL", {
        method: "GET",
        headers: headers,
      });

      const data = await response.json();

      if (response.ok) {
        const tree = data.organizationList;
        organizationTreeRaw.current = tree; // store raw tree
        setOrganizationTreeOptions(flattenTreeToGroups(tree));
        // setOrganizationTreeOptions(flattenTreeToGroups(data.organizationList));
      } else {
        console.error(`Error fetching organization data:, ${data.message}`);
      }
    } catch (error) {
      console.error(`Error fetching organization tree:, ${error}`);
    }
  };

  useEffect(() => {
    if (currentFilter === "organizationName") {
      fetchOrganizationTree();
    }
  }, [currentFilter]);

  useEffect(() => {
    const savedStatus = sessionStorage.getItem("selectedCallStatus");

    if (savedStatus) {
      setStatus(savedStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WORKING ABORT CONTROLLER JUST DOES NOT HAVE THE CONSOLES OF IT...
  const fetchFilteredData = useCallback(
    async (
      pageNum = currentPage,
      perPage = itemsPerPage,
      statusParam = null,
      filters = columnSearchValues,
      overrideStartDate = null,
      overrideEndDate = null, // ✅ ADD THIS
    ) => {
      // setInteractions([]);
      if (pageNum === 1) setInteractions([]);

      const requestId = Date.now();
      latestRequestVersion.current = requestId;

      const controller = new AbortController();
      const signal = controller.signal;
      abortControllerRef.current = controller;

      // Timezone decrypt
      let timezone = null;
      try {
        const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

        if (encryptedTimezone) {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          timezone = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        }
      } catch (err) {
        console.error("Failed to decrypt timezone:", err);
      }

      // User decrypt
      let userId = null;
      try {
        const encryptedUserData = sessionStorage.getItem("user");

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          userId = user?.userId || null;
        }
      } catch (error) {
        console.error("[User] Error decrypting user data:", error);
      }

      let privilegeId = null;

      if (hasPrivilege(27)) {
        privilegeId = 27; // ✅ takes priority if present
      } else if (hasPrivilege(26)) {
        privilegeId = 26;
      }

      try {
        // Build request body
        const requestBody = {
          pageNo: pageNum,
          rowCountPerPage: perPage,
          search: "",
          queryType: 0,
          fromDate: overrideStartDate
            ? overrideStartDate.toISOString()
            : dateRange.startDate
              ? dateRange.startDate.toISOString()
              : null,
          toDate: overrideEndDate // ✅ REPLACE the toDate line
            ? overrideEndDate.toISOString()
            : dateRange.endDate
              ? dateRange.endDate.toISOString()
              : null,
          callId: filters.callId || "",
          ucid: filters.ucid || "",
          agent: filters.agent || "",
          // durationBucketIds: selectedDurationBucket.map((b) => b.value),
          durationOperator: durationOperator || null,
          durationValue: durationValue ? Number(durationValue) : null,
          durationValue2: durationValue2 ? Number(durationValue2) : null,
          aniDni: filters.aniDni || null,
          formIds: formOptions.map((opt) => Number(opt.value)),
          evaluatorIds: evaluatorOptions.map((opt) => Number(opt.value)),
          organizationIds: tempSelectedOptions.map((opt) => ({
            organizationId: Number(opt.value),
          })),
          agentNameIds: agentNameOptions.map((opt) => ({
            agentsId: opt.value,
          })),
          extensions: filters.extensions || null,
          currentUserId: userId,
          timezone,
          ActiveStatus: Number(statusParam ?? status),
          privilegeId,
        };
        const token = process.env.NEXT_PUBLIC_API_TOKEN;

        // API Call

        const response = await fetch(`/api/interactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ backend expects this
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Response failed:", response.status, errText);
          throw new Error("Request failed");
        }

        const data = await response.json();

        if (latestRequestVersion.current !== requestId) {
          console.warn("Stale response ignored. RequestId mismatch.");
          return;
        }

        setCount(data.totalRecord || 0);
        setInteractions(data.interactions || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            `[Request] Error for page ${pageNum}, perPage ${perPage}:`,
            error,
          );
        } else {
          console.warn("Request aborted");
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentPage,
      itemsPerPage,
      dateRange,
      columnSearchValues,
      // selectedDurationBucket,
      durationOperator,
      durationValue,
      durationValue2,
      agentNameOptions,
      formOptions,
      evaluatorOptions,
      tempSelectedOptions,
    ],
  );

  const latestRequestVersion = useRef(null);
  const historyRef = useRef(null);
  const historyPanelRef = useRef(null); // ✅ ADD THIS

  // ⭐ ALL SELECTED IDS (across pages)
  const allSelectedInteractionIds = [
    ...new Set(Object.values(selectedInteractionIds).flat()),
  ];

  // ⭐ FULL OBJECTS OF SELECTED ROWS
  const selectedInteractions = Object.values(selectedRowsMap)
    .flat()
    .filter(
      (obj, index, self) =>
        index === self.findIndex((o) => o.callId === obj.callId),
    );

  // ⭐ LOG SELECTED ROWS
  useEffect(() => {
    if (!allSelectedInteractionIds.length) return;

    console.log("🟢 Selected Interaction IDs:", allSelectedInteractionIds);
    console.log("📦 Selected Interaction Objects:", selectedInteractions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInteractionIds, interactions]);

  // useEffect(() => {
  //   if (privilegesLoaded && hasPrivilege(1) && hasSearched) {
  //     fetchFilteredData(currentPage, itemsPerPage);
  //   }
  // }, [
  //   fetchFilteredData,
  //   currentPage,
  //   itemsPerPage,
  //   columnSearchValues,
  //   dateRange,
  //   privilegesLoaded,
  //   hasSearched,
  // ]);
  useEffect(() => {
    const saved = sessionStorage.getItem("interactionSearchState");

    if (privilegesLoaded && hasPrivilege(1) && saved) {
      const parsed = JSON.parse(saved);

      const start = parsed.startDate ? new Date(parsed.startDate) : null;
      const end = parsed.endDate ? new Date(parsed.endDate) : null;

      // ✅ Sync date picker sessionStorage
      if (start && end) {
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }

      setDateRange({ startDate: start, endDate: end });

      // ✅ Restore filters so badges reappear
      setColumnSearchValues(parsed.filters || {});
      setDraftColumnFilters(parsed.filters || {});

      // ✅ Restore duration buckets
      if (parsed.durationOperator) setDurationOperator(parsed.durationOperator);
      if (parsed.durationValue) setDurationValue(String(parsed.durationValue));

      // ✅ Restore status
      setStatus(parsed.status ?? null);

      setHasSearched(true);
      setLoading(true);

      // ✅ Fetch with ALL restored filters and dates
      fetchFilteredData(
        1,
        itemsPerPage,
        parsed.status,
        parsed.filters || {},
        start,
        end,
      );
    }
  }, [privilegesLoaded]);

  // REPLACE WITH:
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedButton = historyRef.current?.contains(event.target);
      const clickedPanel = historyPanelRef.current?.contains(event.target);
      if (!clickedButton && !clickedPanel) {
        setHistoryOpen(false);
      }
    };

    if (historyOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [historyOpen]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  const triggerSearch = async () => {
    const appliedFilters = { ...draftColumnFilters };

    // REPLACE WITH:
    let adjustedStart = dateRange.startDate;
    let adjustedEnd = dateRange.endDate;

    const ignoreDateFilters = ["callId", "ucid", "aniDni"];
    const hasIgnoreDateFilter = ignoreDateFilters.some(
      (key) => appliedFilters[key],
    );

    if (hasIgnoreDateFilter) {
      // 365-day window: end = today, start = today - 365
      // BUT only auto-set if the user hasn't manually picked a range
      // We just pass whatever dateRange the user has set (date-range-picker handles the default)
      // No adjustment needed here — the picker already set the correct range
      // FIXED:
    } else if (adjustedEnd) {
      // ⭐ Only auto-calculate start if there is genuinely no start date
      if (!adjustedStart) {
        const hasFilters = Object.keys(appliedFilters).length > 0;
        const newStart = new Date(adjustedEnd);
        if (hasFilters) newStart.setDate(newStart.getDate() - 90);
        else newStart.setDate(newStart.getDate() - 30);
        adjustedStart = newStart;
      }
      // If adjustedStart already exists (user picked it), leave it alone
    }

    const payload = {
      fromDate: adjustedStart,
      toDate: adjustedEnd,
      filters: appliedFilters,
      // durationBucketIds: selectedDurationBucket.map((b) => b.value),
      status,
      durationOperator: durationOperator || null,
      durationValue: durationValue ? Number(durationValue) : null,
      durationValue2: durationValue2 ? Number(durationValue2) : null,
      columnVisibility, // ✅ ADD THIS
    };

    sessionStorage.setItem(
      "interactionSearchState",
      JSON.stringify({
        startDate: adjustedStart,
        endDate: adjustedEnd,
        filters: appliedFilters,
        // durationBucketIds: selectedDurationBucket.map((b) => b.value),
        durationOperator: durationOperator || null,
        durationValue: durationValue ? Number(durationValue) : null,
        durationValue2: durationValue2 ? Number(durationValue2) : null,
        status,
      }),
    );
    // ✅ ADD THIS — keep date picker's sessionStorage in sync
    sessionStorage.setItem(
      "interactionDateRange",
      JSON.stringify({
        startDate: adjustedStart ? adjustedStart.toISOString() : null,
        endDate: adjustedEnd ? adjustedEnd.toISOString() : null,
      }),
    );

    // 🔹 decrypt user
    const encryptedUserData = sessionStorage.getItem("user");
    const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
    const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // 🔹 save search history (non-critical — ignore if route missing)
    fetch("/api/interactions/saveSearch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.userId, payload }),
    }).catch(() => {});

    // decrypt timezone
    const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
    let timezone = null;

    if (encryptedTimezone) {
      const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
      timezone = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }

    // non-critical — never block search
    fetch("/api/interactions/searchHistory", {
      headers: { loggedInUserId: user.userId, timezone: timezone },
    })
      .then((r) => r.json())
      .then((d) => { if (d?.history) setSearchHistory(d.history); })
      .catch(() => {});

    setColumnSearchValues(appliedFilters);
    setCurrentPage(1);
    setHasSearched(true);
    setLoading(true);
    setFiltersPending(false);

    fetchFilteredData(
      1,
      itemsPerPage,
      status,
      appliedFilters,
      adjustedStart,
      adjustedEnd,
    );
  };

  const handleStatusChange = (event) => {
    setColumnSearchValues({});
    setDraftColumnFilters({});
    setTempSelectedOptions([]);
    const newStatus = event.target.value || null;

    // Save to sessionStorage
    if (newStatus) {
      sessionStorage.setItem("selectedCallStatus", newStatus);
    } else {
      sessionStorage.removeItem("selectedCallStatus");
    }

    setStatus(newStatus);

    // 🔹 Clear old data & show loading instantly
    setInteractions([]);
    setLoading(true);

    // fetchFilteredData(currentPage, itemsPerPage, newStatus);
  };

  const handleDateChange = (start, end) => {
    setInteractions([]);
    // setLoading(true);
    setCurrentPage(1);
    setDateRange({ startDate: start, endDate: end });
  };

  const handleModalSearch = () => {
    // Filters that DON'T use text input
    const nonTextFilters = [
      "organizationName",
      "agentName",
      "formIds",
      "evaluatorIds",
      "callDuration", // ⭐ ADD THIS
    ];

    if (
      modalSearchValue?.trim() === "" &&
      !nonTextFilters.includes(currentFilter)
    ) {
      setModalOpen(false);
      return;
    }
    if (currentFilter === "organizationName") {
      if (tempSelectedOptions.length === 0) {
        setModalOpen(false);
        return; // do nothing if nothing selected
      }
      setSelectedDropdownOptions(tempSelectedOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: tempSelectedOptions.map((opt) => opt.label).join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "agentName") {
      if (agentNameOptions.length === 0) {
        setModalOpen(false);
        return; // do nothing if nothing selected
      }
      setSelectedDropdownOptions(agentNameOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: agentNameOptions.map((opt) => opt.label).join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "formIds") {
      if (formOptions.length === 0) {
        setModalOpen(false);
        return; // stop modal if nothing selected
      }
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: formOptions.map((opt) => opt.label).join(", "),
      }));
    } else if (currentFilter === "evaluatorIds") {
      if (evaluatorOptions.length === 0) {
        setModalOpen(false);
        return; // stop modal if nothing selected
      }
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: evaluatorOptions.map((opt) => opt.label).join(", "),
      }));
    } else if (currentFilter === "callDuration") {
      if (!durationValue) {
        setModalOpen(false);
        return;
      }
      if (durationOperator === "between" && !durationValue2) {
        setModalOpen(false);
        return;
      }
      const label =
        durationOperator === "between"
          ? `between ${durationValue} - ${durationValue2} sec`
          : `${durationOperator} ${durationValue} sec`;
      setDraftColumnFilters((prev) => ({
        ...prev,
        callDuration: label,
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else {
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: modalSearchValue,
      }));
    }
    // setLoading(true);
    // setCurrentPage(1);
    // fetchFilteredData(1, itemsPerPage);
    setCurrentPage(1);
    // setSelectedColumns((prev) => [...prev, currentFilter]);
    setModalOpen(false);
    setModalSearchValue("");
    setFiltersPending(true);
  };

  const handleRemoveBadge = async (filterId) => {
    setLoading(true);
    setSelectedColumns((prev) => prev.filter((col) => col !== filterId));
    if (filterId === "organizationName") {
      setSelectedDropdownOptions([]);
      setTempSelectedOptions([]);
    }
    if (filterId === "agentName") {
      setAgentNameOptions([]);
    }
    if (filterId === "formIds") {
      setFormOptions([]);
    }
    if (filterId === "callDuration") {
      setDurationOperator(">");
      setDurationValue("");
      setDurationValue2("");
    }
    if (filterId === "evaluatorIds") {
      setEvaluatorOptions([]);
    }

    const updatedDraft = { ...draftColumnFilters };
    delete updatedDraft[filterId];
    setDraftColumnFilters(updatedDraft);

    const updatedSearchValues = { ...columnSearchValues };
    delete updatedSearchValues[filterId];
    setColumnSearchValues(updatedSearchValues);

    setCurrentPage(1);

    const remainingFilters = Object.keys(updatedDraft);
    const stillHasIgnoreDateFilter = ["callId", "ucid", "aniDni"].some((key) =>
      remainingFilters.includes(key),
    );

    // ⭐ Only touch date range if the removed filter was an ignore-date filter
    const removedWasIgnoreDateFilter = ["callId", "ucid", "aniDni"].includes(
      filterId,
    );

    if (!stillHasIgnoreDateFilter && removedWasIgnoreDateFilter) {
      // Restoring from ANI/UCID/CallId removal
      if (
        preDateFilterRange.current?.startDate &&
        preDateFilterRange.current?.endDate
      ) {
        const { startDate: savedStart, endDate: savedEnd } =
          preDateFilterRange.current;
        setDateRange({ startDate: savedStart, endDate: savedEnd });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: savedStart.toISOString(),
            endDate: savedEnd.toISOString(),
          }),
        );
        preDateFilterRange.current = null;
      } else {
        const dayRange = remainingFilters.length > 0 ? 90 : 30;
        const end = new Date();
        end.setHours(23, 59, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - (dayRange - 1));
        start.setHours(0, 0, 0, 0);
        setDateRange({ startDate: start, endDate: end });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }
    } else if (!removedWasIgnoreDateFilter && !stillHasIgnoreDateFilter) {
      // ⭐ Non-ignore filter removed — only reset dates if user had NO date range set
      // If user had manually picked dates, keep them exactly as-is
      if (!dateRange.startDate || !dateRange.endDate) {
        const dayRange = remainingFilters.length > 0 ? 90 : 30;
        const end = new Date();
        end.setHours(23, 59, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - (dayRange - 1));
        start.setHours(0, 0, 0, 0);
        setDateRange({ startDate: start, endDate: end });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }
      // else: user has a date range already — leave it completely untouched
    }
  };

  const handlePageChange = (pageNum, perPage = itemsPerPage) => {
    setCurrentPage(pageNum);
    setItemsPerPage(perPage);

    if (hasSearched) {
      setLoading(true);
      fetchFilteredData(
        pageNum,
        perPage,
        status,
        columnSearchValues,
        dateRange.startDate,
        dateRange.endDate,
      );
    }
  };

  const applyHistorySearch = (payload) => {
    const start = new Date(payload.fromDate);
    const end = new Date(payload.toDate);

    handleDateChange(start, end);

    const filters = payload.filters || {};
    setDraftColumnFilters(filters);
    setColumnSearchValues(filters);

    if (payload.durationOperator) setDurationOperator(payload.durationOperator);
    if (payload.durationValue) setDurationValue(String(payload.durationValue));

    if (payload.columnVisibility) {
      setColumnVisibility(payload.columnVisibility);
    }

    setStatus(payload.status);
    setCurrentPage(1);
    setHasSearched(true); // ← change to true
    setFiltersPending(false); // ← not pending, we're fetching now
    setLoading(true);

    // ← ADD THIS: directly trigger the fetch
    fetchFilteredData(1, itemsPerPage, payload.status, filters, start, end);
  };

  const dropDownStyle = {
    option: (provided, state) => ({
      ...provided,
      fontSize: "11px", // Set font size for individual options
      backgroundColor: state.isFocused
        ? "hsl(var(--muted))"
        : "hsl(var(--popover))",
      color: "hsl(var(--foreground))",
      padding: "4px 8px",
    }),
    menu: (provided) => ({
      ...provided,
      fontSize: "10px", // Set font size for all dropdown options
    }),
    control: (provided) => ({
      ...provided,
      borderRadius: "0.375rem", // Rounded corners
      fontSize: "0.740rem", // Text size equivalent to "text-xs"
      boxShadow: "none", // Removes shadow for cleaner UI
      padding: "0px", // Removes extra padding
      minHeight: "32px", // Sets a smaller minimum height
      width: "110px",
      height: "32px", // Explicitly sets a smaller height
      "&:hover": {
        borderColor: "hsl(var(--ring))",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "hsl(var(--muted-foreground))",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "4px",
      color: "hsl(var(--muted-foreground))",
      ":hover": {
        color: "hsl(var(--foreground))",
      },
    }),
    indicatorSeparator: () => ({
      display: "none", // Removes the vertical line separator
    }),
  };
  const privilegeId = hasPrivilege(27) ? 27 : hasPrivilege(26) ? 26 : 27; // default 27

  const FilterBadge = ({ filterKey, label, value, onRemove }) => {
    const valuesArray = value.split(",").map((v) => v.trim());
    const maxToShow = 4;
    const hiddenCount = valuesArray.length - maxToShow;

    return (
      <div className="flex items-center px-2 py-1 bg-muted rounded-full shadow-md">
        <span className="flex items-center gap-1 text-xs">
          <strong>{label}:</strong>

          {valuesArray.slice(0, maxToShow).join(", ")}

          {/* +X more button → open modal */}
          {hiddenCount > 0 && (
            <button
              className="text-primary ml-1 hover:underline"
              onClick={() => {
                setCurrentFilter(filterKey);
                setModalOpen(true);
              }}
            >
              +{hiddenCount} more
            </button>
          )}
        </span>

        <button
          className="ml-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:opacity-90"
          onClick={() => onRemove(filterKey)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };
  const resetModalState = () => {
    setModalSearchValue("");
    setCurrentFilter(null);

    // dropdown temp states
    setTempSelectedOptions([]);
    setAgentNameOptions([]);
    setFormOptions([]);
    setEvaluatorOptions([]);

    // duration dropdown temp selection should NOT persist
    setDurationOperator(">");
    setDurationValue("");
  };

  const hasSelection = allSelectedInteractionIds.length > 0;
  // ⭐ DOWNLOAD SELECTED INTERACTIONS
  const handleDownloadSelected = async () => {
    if (!allSelectedInteractionIds.length) return;

    try {
      setConfirmDownloadOpen(false); // close confirm popup
      setDownloadLoading(true); // show loader

      const encryptedUserData = sessionStorage.getItem("user");
      const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

      const response = await fetch("/api/interactions/downloadSelected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: user?.userId,
          userName: user?.userFullName,
        },
        body: JSON.stringify({
          interactionIds: selectedInteractions,
        }),
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "SelectedInteractions.zip";
      a.click();

      window.URL.revokeObjectURL(url);

      // ✅ show success popup
      setLastDownloadCount(allSelectedInteractionIds.length); // ✅ store count
      setDownloadSuccessOpen(true);
      resetSelections();
    } catch (err) {
      console.error(err);
      alert("Download failed");
    } finally {
      setDownloadLoading(false);
    }
  };
  return (
    <>
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-2">
        <DatePickerWithRange
          // key={`${dateRange.startDate}-${dateRange.endDate}`}
          key={`${dateRange.startDate?.toDateString()}-${dateRange.endDate?.toDateString()}`}
          onDateChange={handleDateChange}
          isFilterApplied={
            Object.keys(draftColumnFilters).length > 0 ||
            Object.keys(columnSearchValues).length > 0
          }
          initialStartDate={dateRange.startDate}
          initialEndDate={dateRange.endDate}
          isIgnoreDateFilter={
            !!(
              draftColumnFilters.callId ||
              draftColumnFilters.ucid ||
              draftColumnFilters.aniDni
            )
          }
        />
        <Select
          styles={dropDownStyle}
          value={null} // Ensures the value does not change when a filter is selected
          isSearchable={false}
          onChange={(selected) => {
            // ⭐ Save current date range before ANI/UCID/CallId expands it to 365 days
            if (["callId", "ucid", "aniDni"].includes(selected.value)) {
              preDateFilterRange.current = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              };
            }
            setCurrentFilter(selected.value);
            setModalOpen(true);
          }}
          options={[
            ...(status === "0" || status === null
              ? [
                  { value: "ucid", label: "UCID" },
                  { value: "extensions", label: "Extension" },
                  { value: "agent", label: "Agent Id" },
                ]
              : []),
            ...(status === "1"
              ? [
                  { value: "formIds", label: "Form" },
                  { value: "evaluatorIds", label: "Evaluator" },
                ]
              : []),
            { value: "callId", label: "Call ID" },
            // { value: "aniDni", label: "Ani/Dnis" }, // ⭐ NEW
            { value: "aniDni", label: "ANI/DNIS" }, // was "Ani/Dnis"
            { value: "callDuration", label: "Call Duration" }, // ⭐ NEW
            { value: "agentName", label: "Agent Name" },
            { value: "organizationName", label: "Organization" },
          ]}
          placeholder="Add Filters"
        />
        <select
          value={status || ""}
          onChange={handleStatusChange}
          className="px-2 py-1 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48 text-xs"
        >
          <option value="0">Interactions</option>
          <option value="1">Evaluations</option>
        </select>
        {/* ✅ Recent Searches moved here, right after the dropdown */}
        {/* Single ref wrapper containing BOTH button and panel */}
        <div ref={historyRef}>
          <button
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="text-xs bg-muted px-3 py-1 rounded-md border hover:bg-primary hover:text-white whitespace-nowrap"
          >
            Recent Searches {historyOpen ? "▲" : "▼"}
          </button>
        </div>

        <Button
          size="sm"
          onClick={triggerSearch}
          className="flex items-center gap-1 px-3 py-1 text-xs"
        >
          <FaSearch className="h-3 w-3" />
          Search
        </Button>

        {/* ✅ FAQ pushed to far right with ml-auto */}
        <HiMiniInformationCircle
          onClick={() => setHelpOpen(true)}
          className="h-7 w-7 ml-auto cursor-pointer text-blue-500 hover:text-blue-600"
        />
      </div>
      {historyOpen && (
        <div ref={historyPanelRef} className="px-4">
          <div className="w-full mt-1 max-h-[260px] overflow-y-auto bg-popover border rounded-md shadow-md z-50">
            {searchHistory.length === 0 && (
              <p className="text-xs p-3 text-muted-foreground">
                No search history
              </p>
            )}
            {searchHistory.map((h, index) => {
              const payload = h.payload;
              const filters = payload.filters || {};
              const from = payload.fromDate
                ? new Date(payload.fromDate).toLocaleDateString()
                : null;
              const to = payload.toDate
                ? new Date(payload.toDate).toLocaleDateString()
                : null;
              const time = new Date(h.createdAt).toLocaleString();

              const filterList = [];
              if (filters.callId) filterList.push(`Call ID: ${filters.callId}`);
              if (filters.aniDni)
                filterList.push(`ANI/DNIS: ${filters.aniDni}`);
              if (filters.extensions)
                filterList.push(`Ext: ${filters.extensions}`);
              if (filters.ucid) filterList.push(`UCID: ${filters.ucid}`);
              if (filters.agent) filterList.push(`Agent: ${filters.agent}`);
              if (filters.organizationName)
                filterList.push(`Org: ${filters.organizationName}`);
              if (filters.agentName)
                filterList.push(`Agent Name: ${filters.agentName}`);
              if (filters.callDuration)
                filterList.push(`Duration: ${filters.callDuration}`);
              if (payload.durationOperator && payload.durationValue) {
                filterList.push(
                  `Duration: ${payload.durationOperator} ${payload.durationValue} sec`,
                );
              }

              return (
                <div
                  key={h.id}
                  onClick={() => {
                    applyHistorySearch(payload);
                    setHistoryOpen(false);
                  }}
                  className={`cursor-pointer px-4 py-2 hover:bg-muted flex items-center gap-2 text-xs w-full overflow-hidden ${
                    index !== 0 ? "border-t border-border" : ""
                  }`}
                >
                  {/* Serial number */}
                  <span className="text-muted-foreground shrink-0 w-5">
                    {index + 1}.
                  </span>

                  {/* Timestamp */}
                  <span className="text-primary font-semibold whitespace-nowrap shrink-0">
                    {time}
                  </span>

                  <span className="text-muted-foreground shrink-0">|</span>

                  {/* Date range */}
                  {from && to && (
                    <>
                      <span className="text-muted-foreground whitespace-nowrap shrink-0">
                        {from} → {to}
                      </span>
                      {filterList.length > 0 && (
                        <span className="text-muted-foreground shrink-0">
                          |
                        </span>
                      )}
                    </>
                  )}

                  {/* Filters - truncated */}
                  {filterList.length > 0 && (
                    <span className="text-muted-foreground truncate">
                      {filterList.join(" | ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap space-x-2 mt-4 ml-3">
        {Object.entries(draftColumnFilters).map(([key, value]) => (
          <FilterBadge
            key={key}
            filterKey={key}
            label={filterLabels[key] || key}
            value={value}
            onRemove={handleRemoveBadge}
          />
        ))}
        {/*{filtersPending && (
          <span className="text-xs text-muted-foreground ml-2">
            Click <strong>Search</strong> to apply filters
          </span>
        )}*/}
      </div>

      {modalOpen && (
        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            if (!open) resetModalState(); // ⭐ reset when closed via ❌
            setModalOpen(open);
          }}
        >
          <DialogContent>
            <DialogTitle>
              Select{" "}
              {filterTitles[currentFilter] ||
                currentFilter.charAt(0).toUpperCase() +
                  currentFilter
                    .slice(1)
                    .replace(/([A-Z])/g, " $1")
                    .trim()}
            </DialogTitle>
            {currentFilter === "organizationName" ? (
              <Select
                options={organizationTreeOptions}
                styles={customStyles}
                value={tempSelectedOptions}
                onChange={handleOrganizationChange} // 🔁 Custom logic
                isClearable
                isMulti={true}
                className="text-xs"
                isSearchable={true}
                placeholder="Select an organization"
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                components={{
                  Option: (props) => (
                    <components.Option {...props}>
                      <div className="flex items-center">
                        <span
                          className={`w-4 h-4 mr-2 inline-flex border rounded justify-center items-center
  ${props.isSelected ? "border-green-600" : "border-gray-500"}`}
                        >
                          {props.isSelected && (
                            <svg
                              className="w-3 h-3 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm">{props.label}</span>
                      </div>
                    </components.Option>
                  ),
                  MultiValue: ({ index, getValue, ...props }) => {
                    const maxToShow = 2;
                    const values = getValue();
                    const overflow = values.length - maxToShow;

                    if (index < maxToShow) {
                      return <components.MultiValue {...props} />;
                    }

                    if (index === maxToShow) {
                      return (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "hsl(var(--muted-foreground))",
                            padding: "2px 6px",
                            whiteSpace: "nowrap",
                            backgroundColor: "hsl(var(--muted))",
                            borderRadius: "4px",
                            marginLeft: "2px",
                            marginRight: "-15px",
                          }}
                        >
                          +{overflow} more
                        </div>
                      );
                    }

                    return null;
                  },
                }}
              />
            ) : currentFilter === "agentName" ? (
              <AgentDDL
                isMulti={true}
                value={agentNameOptions}
                // onChange={setAgentNameOptions}
                onChange={(selectedOptions) =>
                  setAgentNameOptions(selectedOptions || [])
                }
              />
            ) : currentFilter === "formIds" ? (
              <FormDDLForReport
                isMulti={true}
                value={formOptions}
                onChange={setFormOptions}
              />
            ) : currentFilter === "evaluatorIds" ? (
              <EvaluatorDDL
                isMulti={true}
                value={evaluatorOptions}
                onChange={setEvaluatorOptions}
              />
            ) : currentFilter === "callDuration" ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={durationOperator}
                    onChange={(e) => {
                      setDurationOperator(e.target.value);
                      setDurationValue2(""); // reset second value when operator changes
                    }}
                    className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="=">=&nbsp;&nbsp;(equal to)</option>
                    <option value="<">&lt;&nbsp;&nbsp;(less than)</option>
                    <option value=">">&gt;&nbsp;&nbsp;(greater than)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="between">Between</option>
                  </select>

                  <Input
                    type="number"
                    min={0}
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder={
                      durationOperator === "between"
                        ? "From (sec)"
                        : "Enter seconds"
                    }
                    className="flex-1"
                  />

                  {durationOperator === "between" && (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        to
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={durationValue2}
                        onChange={(e) => setDurationValue2(e.target.value)}
                        placeholder="To (sec)"
                        className="flex-1"
                      />
                    </>
                  )}

                  {durationOperator !== "between" && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      sec
                    </span>
                  )}
                </div>

                {durationValue && (
                  <p className="text-xs text-muted-foreground">
                    {durationOperator === "between" && durationValue2
                      ? `Filter: duration between ${durationValue} sec and ${durationValue2} sec`
                      : `Filter: duration ${durationOperator} ${durationValue} sec`}
                  </p>
                )}
              </div>
            ) : (
              <Input
                type="text"
                value={modalSearchValue}
                maxLength={50}
                onChange={(e) => {
                  let value = e.target.value;

                  if (currentFilter === "extensions") {
                    value = value.replace(/[^\d]/g, "");
                    if (value.length > 15) {
                      value = value.slice(0, 15);
                    }
                  }

                  setModalSearchValue(value);
                }}
                // placeholder={`Enter ${currentFilter}`}
                placeholder={
                  filterPlaceholders[currentFilter] || `Enter ${currentFilter}`
                }
              />
            )}
            <div className="flex justify-end mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetModalState();
                  setModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleModalSearch}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-1 items-center px-4 py-2">
        <Suspense fallback={<div className="text-xs">Loading...</div>}>
          {hasPrivilege(1) ? (
            <>
              {/* ⭐ RIGHT CORNER BULK ACTION BUTTON */}
              <div className="flex justify-end mb-2 gap-2">
                {hasSelection && (
                  <>
                    <button
                      onClick={() => setConfirmDownloadOpen(true)}
                      className="bg-[#1a76d1] hover:bg-[#2C2D3F] text-white text-xs px-4 py-1.5 rounded-md shadow-sm"
                    >
                      Download ({allSelectedInteractionIds.length})
                    </button>

                    {/* 🟡 RESET BUTTON */}
                    <button
                      onClick={resetSelections}
                      className="bg-gray-400 hover:bg-gray-600 text-white text-xs px-4 py-1.5 rounded-md shadow-sm"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
              <DataTable
                key={tableKey}
                data={interactions}
                columns={
                  status === "0" || status === null
                    ? interactionColumns
                    : evaluationsColumns
                }
                // ✅ ADD THIS:
                // initialColumnVisibility={
                //   status === "0" || status === null
                //     ? interactionDefaultVisibility
                //     : {}
                // }
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                rowIdKey="callId"
                selectableRows={true}
                rowClickSelection={true}
                selectColumnLabel="Select"
                selectedRowIds={selectedInteractionIds[currentPage] || []}
                onSelectedRowIdsChange={(ids) => {
                  // store ids (existing)
                  setSelectedInteractionIds((prev) => ({
                    ...prev,
                    [currentPage]: ids,
                  }));

                  // ⭐ store FULL ROW OBJECTS for this page
                  const selectedRows = interactions.filter((row) =>
                    ids.includes(row.callId),
                  );

                  setSelectedRowsMap((prev) => ({
                    ...prev,
                    [currentPage]: selectedRows,
                  }));
                }}
                tableMeta={{
                  onToggleAllSelectOrg: handleToggleAllSelectInteractions,
                }}
                loading={loading}
                onRowClick={"/dashboard/interactions/"}
                exportType={
                  status === "0" || status === null
                    ? "Interaction"
                    : "Evaluation"
                }
                allowedExportTypes={allowedExportTypes}
                daterange={dateRange}
                filters={columnSearchValues}
                agentNameFilter={agentNameOptions}
                formFilter={formOptions}
                evaluatorFilter={evaluatorOptions}
                OrganizationFilter={selectedDropdownOptions}
                exportStatus={status}
                currentPageNum={currentPage}
                itemsPerPage={itemsPerPage}
                privilegeId={privilegeId}
              />

              {count >= 0 && (
                <DataTablePagination
                  totalRecords={count}
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
      </div>
      {/* 🟡 CONFIRM DOWNLOAD DIALOG */}
      <Dialog open={confirmDownloadOpen} onOpenChange={setConfirmDownloadOpen}>
        <DialogContent>
          <DialogTitle>Confirm Download</DialogTitle>

          <p className="text-sm mt-2">
            Are you sure you want to download{" "}
            <strong>{allSelectedInteractionIds.length}</strong> recordings?
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDownloadOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleDownloadSelected}>Yes, Download</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 🔵 DOWNLOAD LOADER */}
      {downloadLoading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-xl shadow-xl text-center w-[350px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>

            <p className="text-sm font-semibold">Preparing your ZIP file...</p>

            <p className="text-xs text-gray-500 mt-1">
              Processing {allSelectedInteractionIds.length} recordings
            </p>
          </div>
        </div>
      )}
      {/* 🟢 SUCCESS DIALOG */}
      <Dialog open={downloadSuccessOpen} onOpenChange={setDownloadSuccessOpen}>
        <DialogContent>
          <DialogTitle>Download Complete 🎉</DialogTitle>

          <p className="text-sm mt-2">
            {lastDownloadCount} recordings downloaded successfully.
          </p>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setDownloadSuccessOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Help & FAQ</DialogTitle>

          <div className="text-sm space-y-4 mt-2">
            <div>
              <p className="font-semibold">1. Default Date Range</p>
              <p className="text-muted-foreground">
                By default, the last <strong>30 days</strong> are pre-selected.
                No data loads until you click <strong>Search</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">
                2. Filters and 90-Day Search Window
              </p>
              <p className="text-muted-foreground">
                When any filter (Agent Name, Organization, Extension, Call
                Duration, Form, Evaluator) is applied, the search window
                automatically expands to <strong>90 days</strong>. Removing all
                such filters resets the window back to <strong>30 days</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">
                3. UCID, Call ID, and ANI/DNIS Filters
              </p>
              <p className="text-muted-foreground">
                These three filters bypass the date range entirely and search
                across <strong>365 days</strong>. While any of these is active,
                the date picker is overridden. Removing them restores your
                previous date range.
              </p>
            </div>

            <div>
              <p className="font-semibold">4. Call Duration Filter</p>
              <p className="text-muted-foreground">
                Filter interactions by duration in seconds. Supported operators:{" "}
                <strong>=</strong> (equal), <strong>&lt;</strong> (less than),{" "}
                <strong>&gt;</strong> (greater than), <strong>&lt;=</strong>{" "}
                (less than or equal), <strong>&gt;=</strong> (greater than or
                equal), and <strong>Between</strong> (specify a from and to
                value in seconds, e.g. between 30 and 70 sec).
              </p>
            </div>

            <div>
              <p className="font-semibold">5. Recent Searches</p>
              <p className="text-muted-foreground">
                Click <strong>Recent Searches</strong> to view and re-apply your
                last searches including all filters and date ranges.
              </p>
            </div>

            <div>
              <p className="font-semibold">6. Interactions vs Evaluations</p>
              <p className="text-muted-foreground">
                Use the dropdown to switch between <strong>Interactions</strong>{" "}
                view (call records) and <strong>Evaluations</strong> view
                (evaluated calls with form and evaluator filters).
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setHelpOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
export { InteractionPage }; // ⭐ named export of unwrapped component
export default withAuth(InteractionPage);
