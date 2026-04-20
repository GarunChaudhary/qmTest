// components\date-range-picker.jsx
"use client";
import DatePicker from "react-datepicker";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useRef } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { format, differenceInCalendarDays } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DatePickerWithRange = ({
  onDateChange,
  isFilterApplied,
  initialStartDate,
  initialEndDate,
  dateDisabled = false, // keep for backward compat but won't be used
  isIgnoreDateFilter = false, // ✅ NEW: UCID/CallId/ANI/DNIS active
}) => {
  // const [startDate, setStartDate] = useState(new Date());
  // const [endDate, setEndDate] = useState(new Date());
  const [startDate, setStartDate] = useState(initialStartDate || new Date());
  const [endDate, setEndDate] = useState(initialEndDate || new Date());
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);

  // Load saved date range from sessionStorage
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      const start = new Date(initialStartDate);
      const end = new Date(initialEndDate);

      // ✅ Force 00:00 for start, 23:59 for end
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 0, 0);

      setStartDate(start);
      setEndDate(end);
      onDateChange(start, end);
      return;
    }

    const storedDateRange = sessionStorage.getItem("interactionDateRange");

    if (storedDateRange) {
      const { startDate: storedStart, endDate: storedEnd } =
        JSON.parse(storedDateRange);
      if (!isNaN(Date.parse(storedStart)) && !isNaN(Date.parse(storedEnd))) {
        const start = new Date(storedStart);
        const end = new Date(storedEnd);

        // ✅ Force correct times
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 0, 0);

        setStartDate(start);
        setEndDate(end);
        onDateChange(start, end);
        return;
      }
    }

    // ✅ No valid stored range — use clean defaults
    const now = new Date();

    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 0, 0); // ✅ yesterday 23:59

    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0); // ✅ 30 days ago 00:00

    setStartDate(start);
    setEndDate(end);

    // ✅ Also save clean defaults to sessionStorage so future loads are consistent
    sessionStorage.setItem(
      "interactionDateRange",
      JSON.stringify({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    );

    onDateChange(
      new Date(
        Date.UTC(
          start.getFullYear(),
          start.getMonth(),
          start.getDate(),
          0,
          0,
          0,
        ),
      ),
      new Date(
        Date.UTC(
          end.getFullYear(),
          end.getMonth(),
          end.getDate(),
          23,
          59,
          59,
          999,
        ),
      ),
    );
  }, []);

  useEffect(() => {
    if (hasUserSelected && startDate && endDate) {
      const updatedRange = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      sessionStorage.setItem(
        "interactionDateRange",
        JSON.stringify(updatedRange),
      );

      const normalizedStart = new Date(
        Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
          0,
        ),
      );

      const normalizedEnd = new Date(
        Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
          59,
          999,
        ),
      );

      onDateChange(normalizedStart, normalizedEnd);
    }
  }, [startDate, endDate, hasUserSelected]);
  // ADD this new useEffect after the existing two useEffects (after the hasUserSelected one):
  const isFirstMount = useRef(true);

  const prevIgnoreDateFilter = useRef(false);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevIgnoreDateFilter.current = isIgnoreDateFilter;
      return;
    }

    // ⭐ Only auto-expand to 365 days when isIgnoreDateFilter transitions false → true
    // Do NOT re-fire when user manually changes dates while filter is already active
    if (isIgnoreDateFilter && !prevIgnoreDateFilter.current) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 364);
      const today = new Date();
      today.setHours(23, 59, 0, 0);
      if (end > today) {
        end.setTime(today.getTime());
      } else {
        end.setHours(23, 59, 0, 0);
      }
      setStartDate(start);
      setEndDate(end);
      sessionStorage.setItem(
        "interactionDateRange",
        JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      );
      onDateChange(start, end);
    }

    prevIgnoreDateFilter.current = isIgnoreDateFilter;
  }, [isIgnoreDateFilter]);

  const handleStartDateChange = (date) => {
    setHasUserSelected(true);

    // ⭐ Extract pure date parts to avoid timezone shift
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // ⭐ Preserve existing start time (hours/minutes), apply to clean date
    const hours = startDate ? startDate.getHours() : 0;
    const minutes = startDate ? startDate.getMinutes() : 0;
    const newStart = new Date(year, month, day, hours, minutes, 0, 0);
    setStartDate(newStart);

    // Auto-calculate end date
    const autoEnd = new Date(year, month, day, 23, 59, 0, 0);
    if (isIgnoreDateFilter) {
      autoEnd.setDate(autoEnd.getDate() + 364);
    } else {
      autoEnd.setDate(autoEnd.getDate() + 29);
    }

    const today = new Date();
    today.setHours(23, 59, 0, 0);
    if (autoEnd > today) {
      autoEnd.setFullYear(today.getFullYear());
      autoEnd.setMonth(today.getMonth());
      autoEnd.setDate(today.getDate());
      autoEnd.setHours(23, 59, 0, 0);
    }

    setEndDate(autoEnd);
    setStartOpen(false);
  };

  // REPLACE handleEndDateChange with this:
  const handleEndDateChange = (date) => {
    if (!startDate) {
      alert("Please select a start date first.");
      return;
    }

    // ⭐ Extract pure date parts to avoid timezone shift
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // ⭐ Build a clean local date for range validation too
    const cleanClicked = new Date(year, month, day, 0, 0, 0, 0);
    const cleanStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0,
    );

    const MAX_RANGE_DAYS = isIgnoreDateFilter ? 365 : isFilterApplied ? 90 : 30;
    const range = differenceInCalendarDays(cleanClicked, cleanStart);

    if (range < 0) {
      alert("End date must be after start date.");
      return;
    } else if (range > MAX_RANGE_DAYS) {
      alert(`Please select a range within ${MAX_RANGE_DAYS} days.`);
      return;
    }

    // ⭐ Build final end date from pure parts — no timezone bleed
    const newEnd = new Date(year, month, day, 23, 59, 0, 0);

    setEndDate(newEnd);
    setHasUserSelected(true);
    setEndOpen(false);
  };
  const calendarContainerStyle = {
    width: "230px",
  };

  const calendarStyle = {
    width: "100%",
  };

  // Update time for start or end date without resetting the whole date
  const handleTimeChange = (date, isStart, hours, minutes) => {
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    setHasUserSelected(true);

    if (isStart) {
      setStartDate(newDate); // ✅ set directly, no side effects
      setStartOpen(false);
    } else {
      setEndDate(newDate); // ✅ set directly, no side effects
      setEndOpen(false);
    }
  };

  const renderHeader = (date, changeYear, changeMonth, isStart) => (
    <div className="flex items-center justify-between px-1 py-1">
      {/* Month and Year */}
      <div className="flex items-center space-x-2">
        <select
          value={date.getMonth()}
          onChange={({ target: { value } }) => changeMonth(parseInt(value))}
          className="text-xs border rounded p-1"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {new Date(0, i).toLocaleString("default", { month: "short" })}
            </option>
          ))}
        </select>

        <select
          value={date.getFullYear()}
          onChange={({ target: { value } }) => changeYear(parseInt(value))}
          className="text-xs border rounded p-1"
        >
          {Array.from(
            { length: 20 },
            (_, i) => new Date().getFullYear() - 10 + i,
          ).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Time (Hours and Minutes) on right */}
      <div className="flex items-center space-x-1">
        <select
          value={date.getHours()}
          onChange={(e) =>
            handleTimeChange(
              date,
              isStart,
              parseInt(e.target.value),
              date.getMinutes(),
            )
          }
          className="text-xs border rounded p-1"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {i.toString().padStart(2, "0")}
            </option>
          ))}
        </select>

        <span>:</span>

        <select
          value={date.getMinutes()}
          onChange={(e) =>
            handleTimeChange(
              date,
              isStart,
              date.getHours(),
              parseInt(e.target.value),
            )
          }
          className="text-xs border rounded p-1"
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>
              {i.toString().padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 grid-cols-2">
      {/* Start Date Picker */}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={dateDisabled}
            className={`w-[230px] h-8 px-4 text-xs justify-start text-left font-normal space-x-2 flex ${dateDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
          >
            <span className="text-muted-foreground">Start date:</span>
            <span>
              {dateDisabled
                ? "—"
                : startDate
                  ? format(startDate, "MMM dd, yyyy HH:mm")
                  : "Select"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          style={calendarContainerStyle}
        >
          <div
            className="p-1.5 scale-90 origin-top-left -mb-8"
            style={calendarStyle}
          >
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              inline
              renderCustomHeader={({ date, changeYear, changeMonth }) =>
                renderHeader(date, changeYear, changeMonth, true)
              }
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* End Date Picker */}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={!startDate || dateDisabled}
            className={`w-[230px] h-8 px-4 text-xs justify-start text-left font-normal space-x-2 flex ${dateDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
          >
            <span className="text-muted-foreground">End date:</span>
            <span>
              {dateDisabled
                ? "—"
                : endDate
                  ? format(endDate, "MMM dd, yyyy HH:mm")
                  : "Select end date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          style={calendarContainerStyle}
        >
          <div
            className="p-1.5 scale-90 origin-top-left -mb-8"
            style={calendarStyle}
          >
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              minDate={startDate}
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              inline
              disabled={!startDate}
              renderCustomHeader={({ date, changeYear, changeMonth }) =>
                renderHeader(date, changeYear, changeMonth, false)
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePickerWithRange;
