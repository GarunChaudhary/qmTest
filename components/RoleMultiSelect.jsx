// components/RoleMultiSelect.jsx
import React, { useState, useEffect } from "react";
import Select, { components } from "react-select";
import withAuth from "./withAuth";

const RoleMultiSelect = ({
  roles,
  selectedRoles,
  onChange,
  error,
  enforceAgentExclusivity = true,
}) => {
  const [agentRoles, setAgentRoles] = useState([]);
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
  const isAgentSelected = selectedRoles.some((r) =>
    agentRoles.includes(Number(r.value)),
  );

  const filteredRoles = roles
    .filter((role) => {
      if (!enforceAgentExclusivity) return true;
      const isRoleAgent = agentRoles.includes(Number(role.roleId));
      if (isAgentSelected) return isRoleAgent;
      if (selectedRoles.length > 0 && isRoleAgent) return false;
      return true;
    })
    .map((role) => ({
      value: role.roleId,
      label: role.roleName,
    }));

  const customStyles = {
    option: (provided, { isDisabled, isFocused }) => ({
      ...provided,
      padding: "8px 12px",
      fontSize: "0.75rem",
      color: isDisabled ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
      backgroundColor: isFocused ? "hsl(var(--muted))" : "transparent",
      cursor: isDisabled ? "not-allowed" : "pointer",
    }),
    control: (provided) => ({
      ...provided,
      borderColor: "hsl(var(--border))",
      minHeight: "34px",
      height: "34px",
      fontSize: "0.75rem",
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "0.75rem",
      color: "hsl(var(--muted-foreground))",
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "hsl(var(--muted))",
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

  const Option = (props) => (
    <components.Option {...props}>
      <div className="flex items-center">
        <span className="w-4 h-4 mr-2 inline-block border rounded border-border flex justify-center items-center">
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
  );

  const MultiValue = ({ index, getValue, ...props }) => {
    const maxToShow = 1;
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
  };

  return (
    <div className="w-full">
      <Select
        options={filteredRoles}
        isMulti
        value={selectedRoles}
        onChange={onChange}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        isSearchable={false}
        className="text-xs"
        placeholder="Select roles"
        styles={customStyles}
        components={{ Option, MultiValue }}
      />
      {/*{isAgentSelected && (
        <p className="text-xs text-primary mt-1">
          Only one role and one organization can be selected for AGENT.
        </p>
      )}*/}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default withAuth(RoleMultiSelect);

