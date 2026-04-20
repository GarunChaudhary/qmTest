import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

const DynamicReportDataTable = ({
  data,
  totalCount,
  pageNo,
  rowCountPerPage,
  onPageChange,
  onRowCountChange,
}) => {
  const pageCount = Math.ceil(totalCount / rowCountPerPage);
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    // Format options
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleString("en-GB", options);
    // Example output: "02/09/2025, 03:19 PM"
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-muted">
            <tr className="border-b border-border">
              {data.length > 0 &&
                Object.keys(data[0]).map((colName) => (
                  <th
                    key={colName}
                    className="px-4 py-2 text-left text-foreground text-sm font-medium"
                  >
                    {colName.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border hover:bg-muted transition-colors duration-200"
              >
                {/*{Object.values(row).map((value, colIndex) => (
                <td key={colIndex} className="px-4 py-2 text-foreground">
                  {value}
                </td>
              ))}*/}
                {Object.entries(row).map(([colName, value], colIndex) => (
                  <td key={colIndex} className="px-4 py-2 text-foreground">
                    {colName === "EvaluationDate"
                      ? formatDateTime(value)
                      : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 text-xs">
        {totalCount > 0 && (
          <div className="flex justify-between items-center flex-wrap gap-y-2 w-full">
            <div>
              Page {pageNo} of {pageCount} | Total Records: {totalCount}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <label className="mr-1">Rows per page:</label>
              <select
                value={rowCountPerPage}
                onChange={(e) => onRowCountChange(Number(e.target.value))}
                className="text-[11px] border border-border rounded px-1.5 py-0.5"
              >
                {[2, 5, 10, 15, 20, 50, 100].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onPageChange(1)}
                disabled={pageNo === 1}
                className="p-1 disabled:opacity-50"
                aria-label="First page"
              >
                <DoubleArrowLeftIcon />
              </button>

              <button
                onClick={() => onPageChange(pageNo - 1)}
                disabled={pageNo === 1}
                className="p-1 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </button>

              <button
                onClick={() => onPageChange(pageNo + 1)}
                disabled={pageNo >= pageCount}
                className="p-1 disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </button>

              <button
                onClick={() => onPageChange(pageCount)}
                disabled={pageNo >= pageCount}
                className="p-1 disabled:opacity-50"
                aria-label="Last page"
              >
                <DoubleArrowRightIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DynamicReportDataTable;

