// components/organizationTreeDDL.jsx
import React, { useEffect, useState } from "react";
import Select, { components } from "react-select";
import withAuth from "./withAuth";

// Fetch organization tree from API
async function fetchOrganizationTree() {
  const response = await fetch("/api/organizationDDL", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (response.ok) {
    return data.organizationList;
  } else {
    throw new Error(data.message || "Failed to fetch organization data");
  }
}

// Convert tree structure into react-select-compatible format
function transformToSelectOptions(tree) {
  return tree.map((node) => ({
    value: node.id,
    label: node.label,
    // isDisabled: node.isActive === false,
    isDisabled: node.isDisabled || false,
    children: node.children ? transformToSelectOptions(node.children) : [],
  }));
}

function flattenTreeToGroups(tree, depth = 0) {
  const groups = [];

  tree.forEach((node) => {
    groups.push({
      value: node.value,
      label: node.label,
      depth,
      isDisabled: node.isDisabled || false,
    });

    if (node.children && node.children.length > 0) {
      groups.push(...flattenTreeToGroups(node.children, depth + 1));
    }
  });

  return groups;
}

const customStyles = {
  option: (provided, { data, isDisabled, isFocused }) => ({
    ...provided,
    paddingLeft: `${(data.depth || 0) * 12 + 10}px`, // Proper indent
    padding: "8px 12px",
    fontSize: "0.75rem",
    color: isDisabled ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
    backgroundColor: isFocused ? "hsl(var(--muted))" : "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    ":hover": {
      backgroundColor: "transparent",
      color: !isDisabled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
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

const TreeDropdown = ({ onChange, selected, isMulti }) => {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(selected || null);

  useEffect(() => {
    async function loadTreeData() {
      try {
        const treeData = await fetchOrganizationTree();
        // const transformedOptions = flattenTreeToGroups(treeData);
        const transformedOptions = flattenTreeToGroups(
          transformToSelectOptions(treeData)
        );
        setOptions(transformedOptions);
      } catch (error) {
        console.error("Error fetching organization tree:", error);
      }
    }

    loadTreeData();
  }, []);

  useEffect(() => {
    if (selected) {
      setSelectedOption(selected);
    }
  }, [selected]);

  const handleChange = (selected) => {
    if (Array.isArray(selected)) {
      const filtered = selected.filter((item) => !item.isDisabled);
      setSelectedOption(filtered);
      onChange?.(filtered);
    } else {
      if (!selected?.isDisabled) {
        setSelectedOption(selected);
        onChange?.(selected);
      }
    }
  };

  return (
    <div className="w-full">
      <Select
        options={options}
        styles={customStyles}
        value={selectedOption}
        onChange={handleChange}
        isClearable
        isMulti={isMulti} // Dynamically set isMulti based on the prop
        className="text-xs"
        placeholder="Select an organization"
        hideSelectedOptions={false}
        closeMenuOnSelect={false}
        components={{
          Option: (props) => {
            return (
              <components.Option {...props}>
                <div className="flex items-center">
                  {props.selectProps.isMulti && (
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
                  )}
                  <span className="text-sm">{props.label}</span>
                </div>
              </components.Option>
            );
          },

          MultiValue: ({ index, getValue, ...props }) => {
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
          },
        }}
      />
    </div>
  );
};

export default withAuth(TreeDropdown);

