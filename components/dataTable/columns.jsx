"use client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { labels, priorities, statuses } from "./filters";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import React from "react";

// Utility function to convert a string to Camel Case format
const toCamelCase = (str) => {
  if (str === null || str === undefined) return str; // Return null or undefined as-is

  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex flex-col items-center text-[10px] font-semibold">
        <span>SelectOrg</span> {/* ✅ Header title */}
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] mt-1"
        />
      </div>
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onClick={(e) => e.stopPropagation()} // ✅ Prevent row click from firing
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Task" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const label = labels.find((label) => label.value === row.original.label);

      return (
        <div className="flex space-x-2">
          {label && <Badge variant="outline">{label.label}</Badge>}
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("title")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );
      if (!status) {
        return null;
      }
      return (
        <div className="flex w-[100px] items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue("priority")
      );

      if (!priority) {
        return null;
      }

      return (
        <div className="flex items-center">
          {priority.icon && (
            <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{priority.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "action",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];

export const dashboardColumns = [
  {
    accessorKey: "userName",
    headerTitle: "User Name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="USER NAME" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("userName")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "status",
    headerTitle: "Status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="STATUS" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("status")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "role",
    headerTitle: "Role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ROLE" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[100px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("role")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "organization",
    headerTitle: "Organization",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ORGANIZATION" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("organization")}
      </div>
    ),
    filterFn: "includesString",
  },
];

export const formColumns = [
  {
    accessorKey: "form",
    headerTitle: "Form",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="FORM" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("form")}
      </div>
    ),
    filterFn: "includesString",
  },
];

export const agentOrganizationColumns = [
  {
    accessorKey: "agentId", // Matches key in `mappings`
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Agent ID" />
    ),
    cell: ({ row }) => (
      <div style={{ fontSize: "10px" }}>{row.getValue("agentId")}</div>
    ),
  },
  {
    accessorKey: "organizationName", // Matches key in `mappings`
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization Name" />
    ),
    cell: ({ row }) => {
      // Get the raw value for organizationName
      const organizationNames = row.getValue("organizationName");

      // Ensure we have an array of names to work with
      const namesArray = organizationNames
        ? Array.isArray(organizationNames)
          ? organizationNames // Use directly if it's already an array
          : organizationNames.split(",").map((name) => name.trim()) // Split and trim if it's a string
        : []; // Handle null/undefined values with an empty array

      return (
        <div className="p-1 whitespace-nowrap" style={{ fontSize: "10px" }}>
          {namesArray.length > 0 ? (
            namesArray.map((name, index) => (
              <span key={index}>
                {name}
                {index < namesArray.length - 1 && ","}{" "}
                {/* Add comma except after the last item */}
                {(index + 1) % 2 === 0 && <br />}{" "}
                {/* Wrap after every 2 items */}
              </span>
            ))
          ) : (
            <span>N/A</span> // Handle cases with no organization names
          )}
        </div>
      );
    },
  },
];
export const userColumns = [
  {
    accessorKey: "loginId", // This corresponds to the username
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="loginId" />
    ),
    cell: ({ row }) => {
      // Get the raw full name value from the row
      const loginId = row.getValue("loginId");

      // Convert the full name to Camel Case using the helper function
      const camelCaseName = toCamelCase(loginId);

      return (
        <div
          className="w-[90px] truncate whitespace-nowrap p-1"
          style={{ fontSize: "10px" }}
        >
          {camelCaseName}
        </div>
      );
    },
  },
  {
    accessorKey: "userFullName", // This corresponds to the username
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="userFullName" />
    ),
    cell: ({ row }) => {
      // Get the raw full name value from the row
      const fullName = row.getValue("userFullName");

      // Convert the full name to Camel Case using the helper function
      const camelCaseName = toCamelCase(fullName);

      return (
        <div
          className="w-[90px] truncate whitespace-nowrap p-1"
          style={{ fontSize: "10px" }}
        >
          {camelCaseName}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User Email" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-1">
          <span
            className="max-w-[500px] truncate font-medium  p-1"
            style={{ fontSize: "10px" }}
          >
            {row.getValue("email")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "userRole",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const roles = row.getValue("userRole");
      const rolesArray = roles?.split(",").map((role) => role.trim()) || [];

      return (
        <div className="p-1 whitespace-nowrap" style={{ fontSize: "10px" }}>
          {rolesArray.map((role, index) => (
            <span key={index}>
              {role}
              {index < rolesArray.length - 1 && ","}{" "}
              {/* Add comma except after the last item */}
              {(index + 1) % 2 === 0 && <br />} {/* Wrap after every 2 items */}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "organization", // This corresponds to the organization field
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => {
      // Get the raw organization value from the row
      const organization = row.getValue("organization");

      // Helper function to capitalize each word in the string
      const capitalizeWords = (str) => {
        return str
          .split(",")
          .map(
            (word) =>
              word.trim().charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          );
      };

      // Split, capitalize, and handle wrapping behavior
      const organizationsArray =
        organization && typeof organization === "string"
          ? capitalizeWords(organization)
          : []; // Fallback for null/undefined values

      return (
        <div className="p-1 whitespace-nowrap" style={{ fontSize: "10px" }}>
          {organizationsArray.map((org, index) => (
            <span key={index}>
              {org}
              {index < organizationsArray.length - 1 && ","}{" "}
              {/* Add comma except after the last item */}
              {(index + 1) % 2 === 0 && <br />} {/* Wrap after every 2 items */}
            </span>
          ))}
        </div>
      );
    },
  },

  {
    accessorKey: "activeStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Active Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("activeStatus");

      const isInactive = isActive?.toLowerCase() === "inactive";

      return (
        <span className="p-1" style={{ fontSize: "10px" }}>
          {isInactive ? "Inactive" : "Active"}
        </span>
      );
    },
  },

  {
    accessorKey: "isAdmin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Is Admin" />
    ),
    cell: ({ row }) => {
      // Get the user roles as a comma-separated string
      const userRoles = row.getValue("userRole");

      // Check if the 'Admin' role exists in the roles
      const isAdmin = userRoles
        ?.split(",")
        .map((role) => role.trim())
        .includes("Admin");

      return (
        <span className="p-1" style={{ fontSize: "10px" }}>
          {isAdmin ? "Yes" : "No"}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },

  {
    id: "action",
    cell: ({ row }) => (
      <div className=" p-1" style={{ fontSize: "10px" }}>
        <DataTableRowActions row={row} tableType="user" />
      </div>
    ),
  },
  {
    id: "deleteSelect",
    header: ({ table }) => (
      <div className="flex flex-col items-center text-[10px] font-semibold">
        <span>Delete</span>
        <input
          type="checkbox"
          onChange={(e) => {
            const checked = e.target.checked;
            table.options.meta?.onToggleAllDelete?.(checked);
          }}
          checked={
            table.options.meta?.selectedForDelete?.length ===
              table.options.data.length && table.options.data.length > 0
          }
          className="cursor-pointer mt-1"
        />
      </div>
    ),
    cell: ({ row, table }) => (
      <input
        type="checkbox"
        checked={table.options.meta?.selectedForDelete?.includes(
          row.original.userId
        )}
        onChange={(e) => {
          const checked = e.target.checked;
          table.options.meta?.onToggleDelete?.(row.original.userId, checked);
        }}
        className="cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export const interactionColumns = [
  {
    accessorKey: "id",
    headerTitle: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="id" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("id")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "callId",
    headerTitle: "Call ID",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Call ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("callId")}
      </div>
    ),
    filterFn: "includesString",
  },

  {
    accessorKey: "agentId",
    headerTitle: "Agent ID",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="AGENT ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("agentId")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "ucid",
    headerTitle: "UCID",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="UCID" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("ucid")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "personalName",
    headerTitle: "Agent Name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Agent Name" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("personalName")}
      </div>
    ),
    filterFn: "includesString",
  },
  // NEW DATE FORMAT AS ASKED :: FORMAT IS UTC =>

  {
    accessorKey: "audioStartTime",
    headerTitle: "Audio Start Time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Audio Start Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("audioStartTime"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "audioEndTime",
    headerTitle: "Audio End Time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Audio End Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("audioEndTime"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "localStartTime",
    headerTitle: "localStartTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Local Start Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("localStartTime"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "localEndTime",
    headerTitle: "localEndTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Local Start Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("localEndTime"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "sid",
    headerTitle: "SID",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SID" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("sid")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "organizationName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="organizationName" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-0">
          <span
            className="max-w-[500px] truncate  p-1"
            style={{ fontSize: "10px" }}
          >
            {row.getValue("organizationName")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "extension",
    headerTitle: "Extension",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Extension" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("extension")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "ani",
    headerTitle: "ANI",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ANI" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("ani")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "audioModuleNo",
    headerTitle: "audioModuleNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="audioModuleNo" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("audioModuleNo")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "audioChannelNo",
    headerTitle: "audioChannelNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="audioChannelNo" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("audioChannelNo")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "direction",
    headerTitle: "direction",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="direction" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("direction")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "noOfHolds",
    headerTitle: "noOfHolds",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="noOfHolds" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("noOfHolds")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "pbxLoginId",
    headerTitle: "pbxLoginId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="pbxLoginId" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("pbxLoginId")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "duration",
    headerTitle: "duration",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="duration" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("duration")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "dnis",
    headerTitle: "dnis",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="dnis" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("dnis")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "screenExists",
    headerTitle: "screenExists",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="screenExists" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("screenExists")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "screenModule",
    headerTitle: "screenModule",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="screenModule" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("screenModule")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "switchId",
    headerTitle: "switchId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="switchId" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("switchId")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "switchName",
    headerTitle: "switchName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="switchName" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("switchName")}
      </div>
    ),
    filterFn: "includesString",
  },
  // {
  //   accessorKey: "fileLocation",
  //   headerTitle: "fileLocation",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="fileLocation" />
  //   ),
  //   cell: ({ row }) => (
  //     <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
  //       {row.getValue("fileLocation")}
  //     </div>
  //   ),
  //   filterFn: "includesString",
  // },
  // {
  //   accessorKey: "fileSourceType",
  //   headerTitle: "fileSourceType",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="fileSourceType" />
  //   ),
  //   cell: ({ row }) => (
  //     <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
  //       {row.getValue("fileSourceType")}
  //     </div>
  //   ),
  //   filterFn: "includesString",
  // },
  {
    id: "action",
    cell: ({ row }) => (
      <div className=" p-1" style={{ fontSize: "10px" }}>
        <DataTableRowActions row={row} tableType="interaction" />
      </div>
    ),
  },
];
export const evaluationColumns = [
  {
    accessorKey: "callId",
    headerTitle: "Call ID",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Call ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("callId")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "audioStartTime",
    headerTitle: "Start Time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Start Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("audioStartTime"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "duration",
    headerTitle: "Interaction Duration",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Interaction Duration" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("duration")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "user_full_name",
    headerTitle: "Evaluator",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Evaluator" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("user_full_name")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "evaluation_date",
    headerTitle: "Evaluation Time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Evaluation Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("evaluation_date"));
      const formattedDate = date.toLocaleString("en-IN", {
        timeZone: "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
          {formattedDate}
        </div>
      );
    },
    filterFn: "includesString",
  },
  {
    accessorKey: "form_name",
    headerTitle: "Form",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Form" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("form_name")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "personalName",
    headerTitle: "Employee",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Employee" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("personalName")}
      </div>
    ),
    filterFn: "includesString",
  },

  {
    accessorKey: "organizationName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-0">
          <span
            className="max-w-[500px] truncate  p-1"
            style={{ fontSize: "10px" }}
          >
            {row.getValue("organizationName")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "EvaluationCount",
    headerTitle: "Number Of Evaluation",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Number Of Evaluation" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("EvaluationCount")}
      </div>
    ),
    filterFn: "includesString",
  },

  {
    id: "action",
    cell: ({ row }) => (
      <div className=" p-1" style={{ fontSize: "10px" }}>
        <DataTableRowActions row={row} tableType="interaction" />
      </div>
    ),
  },
];
