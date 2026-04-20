// components/dataTable/data-table.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableColumnHeader } from "./data-table-column-header";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";

const columnHeaderDisplayNames = {
  callId: "Call Id",
  audioStartTime: "Audio StartTime",
  audioEndTime: "Audio EndTime",
  agentId: "Agent Id",
  ani: "ANI",
  dnis: "DNIS",
  ucid: "UCID",
  personalName: "Agent Name",
  userFullName: "User Name",
  loginId: "User Login Id",
  localStartTime: " Local StartTime",
  userRole: "User Role",
  activeStatus: "Status",
  isAdmin: "Admin",
  organizationName: "Organization",
  contactPerson: "Contact Person",
  contactMobile: "Mobile",
  addressOfContact: "Address",
  isActive: "Status",
  evaluation_date: "Evaluation Time",
  duration: "Interaction Duration",
  form_name: "Form",
  user_full_name: "Evaluator",
  EvaluationCount: "Number Of Evaluation",
};

export const DataTable = ({
  columns,
  data,
  currentPageNum,
  itemsPerPage,
  showCreateBtn = false,
  loading = false,
  createBasePath,
  onRowClick = () => {},
  rowActions,
  allowedExportTypes,
  exportType,
  exportStatus,
  exportSearch,
  exportRoleFilter,
  exportOrganizationFilter,
  daterange,
  selectableRows = false,
  selectedRowIds = [],
  onSelectedRowIdsChange = () => {},
  rowClickSelection = true,
  filters,
  OrganizationFilter,
  pageType,
  formFilter,
  evaluatorFilter,
  agentNameFilter,
  privilegeId,
  hideToolab,
  addTableTitle,
  tableStyle,
  tableMeta, // ✅ add this line
  rowIdKey = "userId", // ⭐ NEW
  selectColumnLabel = "SelectOrg", // ⭐ ADD THIS LINE
  // initialColumnVisibility = {},
  columnVisibility: columnVisibilityProp = {},
  onColumnVisibilityChange,
}) => {
  const router = useRouter();

  const [rowSelection, setRowSelection] = useState(
    Object.fromEntries(selectedRowIds.map((id) => [id, true])),
  );
  const [columnVisibility, setColumnVisibility] =
    useState(columnVisibilityProp);

  // ✅ REPLACE WITH - only syncs when prop actually has content
  const prevPropRef = useRef(columnVisibilityProp);
  useEffect(() => {
    if (
      JSON.stringify(prevPropRef.current) !==
      JSON.stringify(columnVisibilityProp)
    ) {
      prevPropRef.current = columnVisibilityProp;
      setColumnVisibility(columnVisibilityProp);
    }
  }, [columnVisibilityProp]);

  const [sorting, setSorting] = useState([]);
  const [columnOrder, setColumnOrder] = React.useState([]);

  useEffect(() => {
    if (!selectableRows) {
      setRowSelection({});
    }
  }, [selectableRows]);

  const checkboxColumn = {
    id: "select_org",
    header: ({ table }) => {
      const allRows = table.getRowModel().rows || [];

      const allSelected =
        allRows.length > 0 && allRows.every((r) => r.getIsSelected());

      const someSelected =
        allRows.length > 0 &&
        !allSelected &&
        allRows.some((r) => r.getIsSelected());

      return (
        <div className="flex flex-col items-center text-[10px] font-semibold">
          {/*<span>SelectOrg</span>*/}
          <span>{selectColumnLabel}</span>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => {
              const checked = e.target.checked;
              table.options.meta?.onToggleAllSelectOrg?.(checked);
              table.getToggleAllPageRowsSelectedHandler()(e);
            }}
            className="cursor-pointer mt-1"
          />
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer"
        />
      </div>
    ),
  };

  const visibleColumns = React.useMemo(() => {
    // ✅ Filter out "delete" column if user doesn't have privilege
    const filteredColumns = columns.filter((col) => {
      if (col.id === "delete") {
        const hasDeletePrivilege = tableMeta?.grantedPrivileges?.some(
          (p) => p.PrivilegeId === 5,
        );
        return hasDeletePrivilege; // show only if delete privilege exists
      }
      return col.show !== false;
    });

    // ✅ If de-association (select_org) is active, keep that checkbox column
    return [...(selectableRows ? [checkboxColumn] : []), ...filteredColumns];
  }, [columns, selectableRows, tableMeta]);

  useEffect(() => {
    setColumnOrder(visibleColumns.map((col) => col.id || col.accessorKey));
  }, [visibleColumns]);

  const table = useReactTable({
    data: data,
    columns: visibleColumns,
    // getRowId: (row) => String(row.userId),
    getRowId: (row) => String(row[rowIdKey]),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder, // ✅ ADD THIS
      pagination: {
        pageIndex: currentPageNum - 1,
        pageSize: itemsPerPage,
      },
    },
    onColumnOrderChange: setColumnOrder, // ✅ ADD THIS
    manualPagination: true,
    pageCount: Math.ceil(data.length / itemsPerPage),
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      const selectedIds = Object.keys(newSelection).filter(
        (id) => newSelection[id],
      );
      onSelectedRowIdsChange(selectedIds);
    },
    onSortingChange: (sorting) => {
      setSorting(sorting);
    },
    onColumnVisibilityChange: (updater) => {
      const newVal =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      setColumnVisibility(newVal);
      onColumnVisibilityChange?.(newVal); // ✅ notify page.jsx
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      selectedForDelete: tableMeta?.selectedForDelete || [],
      onToggleDelete: tableMeta?.onToggleDelete,
      onToggleAllDelete: tableMeta?.onToggleAllDelete,
      onBulkDelete: tableMeta?.onBulkDelete,
      onToggleAllSelectOrg: tableMeta?.onToggleAllSelectOrg, // ✅ added
    },
  });

  const handleRowClick = (row) => {
    if (typeof onRowClick === "string") {
      const path =
        row.FormUniqueId != null
          ? `${onRowClick}${row.id}?form_id=${row.FormUniqueId}&user_id=${row.userId}&Status=${exportStatus}`
          : `${onRowClick}${row.id}`;

      router.push(path);
    } else if (typeof onRowClick === "function") {
      onRowClick(row);
    }
  };

  const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-2">
      <span style={hideToolab}>
        <DataTableToolbar
          table={table}
          showCreateBtn={showCreateBtn}
          loading={loading}
          createBasePath={createBasePath}
          exportType={exportType}
          allowedExportTypes={allowedExportTypes}
          exportStatus={exportStatus}
          exportSearch={exportSearch}
          exportRoleFilter={exportRoleFilter}
          exportOrganizationFilter={exportOrganizationFilter}
          daterange={daterange}
          filters={filters}
          OrganizationFilter={OrganizationFilter}
          pageType={pageType}
          formFilter={formFilter}
          evaluatorFilter={evaluatorFilter}
          agentNameFilter={agentNameFilter} // 👈 FIX: pass it here
          privilegeId={privilegeId}
        />
      </span>

      <Card className="shadow-md">
        {addTableTitle && <div>{addTableTitle}</div>}

        <CardContent className="p-6">
          <div className="overflow-x-auto" style={tableStyle}>
            <Table>
              <TableBody>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-muted/90">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        onDragOver={(e) => {
                          e.preventDefault(); // 🔴 REQUIRED
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();

                          const draggedId = e.dataTransfer.getData("columnId");
                          const targetId = header.column.id;

                          setColumnOrder((old) => {
                            const from = old.indexOf(draggedId);
                            const to = old.indexOf(targetId);

                            if (from === -1 || to === -1 || from === to)
                              return old;

                            const next = [...old];
                            next.splice(from, 1);
                            next.splice(to, 0, draggedId);
                            return next;
                          });
                        }}
                      >
                        {loading ? (
                          <Skeleton>
                            <span className="opacity-0 text-xs">0</span>
                          </Skeleton>
                        ) : header.column.id === "delete" ||
                          header.column.id === "select_org" ? (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        ) : (
                          <DataTableColumnHeader
                            column={header.column}
                            title={
                              columnHeaderDisplayNames[header.id] ||
                              capitalizeFirstLetter(header.id)
                            }
                            table={table}
                            onDragStart={(e, draggedId) => {
                              e.dataTransfer.setData("columnId", draggedId);
                            }}
                            onDrop={(e, targetId) => {
                              const draggedId =
                                e.dataTransfer.getData("columnId");

                              setColumnOrder((old) => {
                                const from = old.indexOf(draggedId);
                                const to = old.indexOf(targetId);
                                if (from === -1 || to === -1 || from === to)
                                  return old;

                                const next = [...old];
                                next.splice(from, 1);
                                next.splice(to, 0, draggedId);
                                return next;
                              });
                            }}
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}

                {loading && !data.length ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {visibleColumns.map((col) => (
                        <TableCell key={col.id || col.accessorKey} className="p-2">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : ""}
                      className="cursor-pointer"
                      onClick={() => {
                        if (rowClickSelection) {
                          handleRowClick(row.original);
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="p-0">
                          {loading ? (
                            <Skeleton>
                              <span className="opacity-0">0</span>
                            </Skeleton>
                          ) : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )
                          )}
                        </TableCell>
                      ))}
                      {typeof rowActions === "function" && (
                        <TableCell>{rowActions(row)}</TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
