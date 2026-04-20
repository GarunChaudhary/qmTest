// components/filter_report.jsx
"use client";
import React, { useState, useEffect, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FormDDLForReport from "@/components/formDDL";
import OrgTreeDropDownReport from "@/components/organizationDDLreport";
import AgentDDL from "@/components/agentDDL";
import withAuth from "./withAuth";

// Optional: Your custom date input
const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className={`border border-border px-3 py-1.5 rounded-md text-xs w-36 text-left ${
      !value ? "text-muted-foreground" : "text-foreground"
    }`}
  >
    {value || placeholder}
  </button>
));

// ✅ Add this line to fix the warning
CustomDateInput.displayName = "CustomDateInput";

const ReportFilters = ({
  enabledFilters = [], // ✅ new prop
  filterType,
  setFilterType,
  dateRange,
  setDateRange,
  activeFilter,
  setActiveFilter,
  selectedFormNames,
  setSelectedFormNames,
  selectedOrganizations,
  setSelectedOrganizations,
  selectedAgents,
  setSelectedAgents,
  handleViewReport,
  handleResetFilters,
  isRawDataReport = false,
}) => {
  const [startDate, endDate] = dateRange;
  const [shouldOpenDropdown, setShouldOpenDropdown] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false);

  // Auto-close active filter after 2 seconds of inactivity
  useEffect(() => {
    if (activeFilter && !dropdownActive) {
      const timer = setTimeout(() => {
        setActiveFilter(""); // close active filter
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeFilter, dropdownActive]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-2 w-full">
        {/* LEFT: Filter Controls */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Filter Dropdown */}
          <div className="flex flex-col">
            <label className="text-[11px] text-muted-foreground mb-1">
              Date Filter
            </label>
            <select
              className="border border-border px-3 py-1.5 rounded-md text-xs w-36"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="" disabled>
                Select Date
              </option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="DAY_BEFORE_YESTERDAY">Day Before Yesterday</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="DATE_RANGE">Custom</option>
            </select>
          </div>

          {/* From and To Date Pickers */}
          {filterType === "DATE_RANGE" && (
            <>
              <div className="flex flex-col">
                <label className="text-[11px] text-muted-foreground mb-1">
                  From Date
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setDateRange([date, endDate])}
                  maxDate={new Date()}
                  customInput={<CustomDateInput />}
                  showYearDropdown
                  showMonthDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={25}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[11px] text-muted-foreground mb-1">
                  To Date
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setDateRange([startDate, date])}
                  minDate={startDate}
                  maxDate={new Date()}
                  customInput={<CustomDateInput />}
                  showYearDropdown
                  showMonthDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={25}
                />
              </div>
            </>
          )}

          {/* Filter Selector Dropdown */}
          <div className="flex items-center gap-4">
            <select
              className="border border-border px-3 py-1.5 mt-2 rounded-md text-xs w-40"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="" disabled>
                {" "}
                Select Filter
              </option>
              {enabledFilters.includes("form") && (
                <option value="form">Evaluation Form</option>
              )}

              {enabledFilters.includes("organization") && (
                <option value="organization">Organization</option>
              )}

              {enabledFilters.includes("agent") && (
                <option value="agent">Agent</option>
              )}
            </select>

            {activeFilter === "form" && enabledFilters.includes("form") && (
              <div
                className="min-w-[200px]"
                onMouseEnter={() => setDropdownActive(true)}
                onMouseLeave={() => setDropdownActive(false)}
              >
                <FormDDLForReport
                  isMulti={!isRawDataReport}
                  value={selectedFormNames}
                  onChange={setSelectedFormNames}
                  shouldOpen={activeFilter === "form" && shouldOpenDropdown}
                  onOpened={() => setShouldOpenDropdown(false)} // reset after open
                />
              </div>
            )}

            {activeFilter === "organization" &&
              enabledFilters.includes("organization") && (
                <div
                  className="min-w-[200px]"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  <OrgTreeDropDownReport
                    isMulti
                    selected={selectedOrganizations}
                    onChange={setSelectedOrganizations}
                    shouldOpen={
                      activeFilter === "organization" && shouldOpenDropdown
                    }
                    onOpened={() => setShouldOpenDropdown(false)} // reset after open
                  />
                </div>
              )}

            {activeFilter === "agent" && enabledFilters.includes("agent") && (
              <div
                className="min-w-[200px]"
                onMouseEnter={() => setDropdownActive(true)}
                onMouseLeave={() => setDropdownActive(false)}
              >
                <AgentDDL
                  isMulti
                  value={selectedAgents}
                  onChange={setSelectedAgents}
                  shouldOpen={activeFilter === "agent" && shouldOpenDropdown}
                  onOpened={() => setShouldOpenDropdown(false)} // reset after open
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Action Buttons */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleViewReport}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-xs hover:bg-green-700"
          >
            View Report
          </button>
          <button
            onClick={handleResetFilters}
            className="bg-gray-300 text-foreground px-4 py-1.5 rounded text-xs hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary of Selected Filters */}
      <div className="flex flex-col text-xs text-foreground gap-1 mt-0">
        {/* {selectedFormNames.length > 0 && (
          <div>
            <strong>Forms:</strong>{" "}
            {selectedFormNames
              .slice(0, 3)
              .map((f) => f.label)
              .join(", ")}
            {selectedFormNames.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("form")}
                onClick={() => {
                  setActiveFilter("form");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedFormNames.length - 3} more
              </span>
            )}
          </div>
        )} */}
        {selectedFormNames &&
          (Array.isArray(selectedFormNames)
            ? selectedFormNames.length > 0
            : true) && (
            <div>
              <strong>Forms:</strong>{" "}
              {Array.isArray(selectedFormNames)
                ? selectedFormNames
                    .slice(0, 3)
                    .map((f) => f.label)
                    .join(", ")
                : selectedFormNames.label}
              {Array.isArray(selectedFormNames) &&
                selectedFormNames.length > 3 && (
                  <span
                    className="ml-1 text-primary underline cursor-pointer"
                    onClick={() => {
                      setActiveFilter("form");
                      setShouldOpenDropdown(true);
                    }}
                  >
                    +{selectedFormNames.length - 3} more
                  </span>
                )}
            </div>
          )}
        {selectedOrganizations.length > 0 && (
          <div>
            <strong>Organizations:</strong>{" "}
            {selectedOrganizations
              .slice(0, 3)
              .map((o) => o.label)
              .join(", ")}
            {selectedOrganizations.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("organization")}
                onClick={() => {
                  setActiveFilter("organization");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedOrganizations.length - 3} more
              </span>
            )}
          </div>
        )}

        {selectedAgents.length > 0 && (
          <div>
            <strong>Agents:</strong>{" "}
            {selectedAgents
              .slice(0, 3)
              .map((a) => a.label)
              .join(", ")}
            {selectedAgents.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("agent")}
                onClick={() => {
                  setActiveFilter("agent");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedAgents.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(ReportFilters);

