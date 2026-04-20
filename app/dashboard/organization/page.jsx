"use client";
import React, { useEffect, useState, useRef } from "react";
import CryptoJS from "crypto-js";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { notFound } from "next/navigation";
import "@/app/organization.css";

// ─── helpers ────────────────────────────────────────────────────────────────
const smartCapitalize = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => {
      if (w === w.toUpperCase()) return w;
      return w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "";
    })
    .join(" ");
};

const avatarColor = (id, l = 85) => `hsl(${(id * 47) % 360},60%,${l}%)`;

// Build flat lookup  { id -> node }
const buildMap = (nodes) => {
  const map = {};
  const walk = (n) => {
    map[n.id] = n;
    (n.children || []).forEach(walk);
  };
  nodes.forEach(walk);
  return map;
};

// Transform raw API array into tree
const transformDataForTree = (nodes) => {
  if (!nodes) return null;
  const transformNode = (node, parentActive = true) => {
    const active = Number(node.isActive);
    return {
      name: node.Name || "Unnamed",
      id: node.id,
      isActive: active,
      isDisabled: !parentActive,
      children: (node.children || []).map((c) =>
        transformNode(c, active && parentActive),
      ),
    };
  };
  const root = nodes.find((n) => n.id === 1);
  return root ? transformNode(root) : null;
};

// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
const RightPanel = ({ content, onClose }) => {
  if (!content) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 340,
        background: "hsl(var(--card))",
        borderLeft: "1px solid hsl(var(--border))",
        boxShadow: "-4px 0 32px rgba(0,0,0,0.10)",
        display: "flex",
        flexDirection: "column",
        zIndex: 500,
        animation: "slideIn 0.22s ease",
      }}
    >
      {content}
    </div>
  );
};

// ─── ACTION PANEL content ─────────────────────────────────────────────────────
const ActionPanelContent = ({
  node,
  mode,
  setMode,
  newChildName,
  setNewChildName,
  newChildDesc,
  setNewChildDesc,
  onSave,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onCancel,
  privilegeId,
}) => (
  <>
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid hsl(var(--muted))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: node.isActive === 1 ? "#22C55E" : "#EF4444",
            display: "inline-block",
          }}
        />
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            maxWidth: 210,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {mode === "edit"
            ? `Edit: ${smartCapitalize(node.name)}`
            : mode === "create"
              ? "Create Child Node"
              : smartCapitalize(node.name)}
        </h2>
      </div>
      <button
        onClick={onCancel}
        style={iconBtnStyle()}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <XIcon />
      </button>
    </div>

    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Field label="Organization Name">
        <input
          type="text"
          placeholder="Enter Organization Name"
          value={newChildName}
          maxLength={20}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[a-zA-Z0-9 ]*$/.test(v)) setNewChildName(v);
          }}
          disabled={mode === "view"}
          style={inputStyle(mode === "view")}
          onFocus={(e) => {
            if (mode !== "view") e.target.style.borderColor = "#3B82F6";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "hsl(var(--border))";
          }}
        />
      </Field>
      <Field label="Description">
        <input
          type="text"
          placeholder="Enter Description"
          value={newChildDesc}
          onChange={(e) => setNewChildDesc(e.target.value)}
          disabled={mode === "view"}
          style={inputStyle(mode === "view")}
          onFocus={(e) => {
            if (mode !== "view") e.target.style.borderColor = "#3B82F6";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "hsl(var(--border))";
          }}
        />
      </Field>
      {mode === "view" && (
        <Field label="Status">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: node.isActive === 1 ? "#F0FDF4" : "#FEF2F2",
              color: node.isActive === 1 ? "#16A34A" : "#DC2626",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: node.isActive === 1 ? "#22C55E" : "#EF4444",
                display: "inline-block",
              }}
            />
            {node.isActive === 1 ? "Active" : "Inactive"}
          </span>
        </Field>
      )}
    </div>

    <div
      style={{
        padding: "14px 20px",
        borderTop: "1px solid hsl(var(--muted))",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {mode === "view" && node.isActive === 1 && (
        <>
          {privilegeId?.includes(2) && (
            <button
              onClick={() => {
                setMode("create");
                setNewChildName("");
                setNewChildDesc("");
              }}
              style={btnPrimary()}
            >
              <PlusIcon /> Create Child Node
            </button>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {privilegeId?.includes(3) && (
              <button
                onClick={() => setMode("edit")}
                style={btnSm("var(--brand-primary)", "hsl(var(--accent))")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "hsl(var(--accent))")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "hsl(var(--accent))")
                }
              >
                Edit
              </button>
            )}
            {privilegeId?.includes(5) && (
              <button
                onClick={onDelete}
                style={btnSm("#DC2626", "#FEF2F2")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FEE2E2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#FEF2F2")
                }
              >
                Delete
              </button>
            )}
            {privilegeId?.includes(25) && (
              <button
                onClick={onDeactivate}
                style={btnSm("#D97706", "hsl(var(--card))BEB")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#FEF3C7")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "hsl(var(--card))BEB")
                }
              >
                Deactivate
              </button>
            )}
          </div>
        </>
      )}
      {mode === "view" && node.isActive !== 1 && privilegeId?.includes(25) && (
        <button
          onClick={onActivate}
          style={{
            ...btnPrimary(),
            background: "#16A34A",
            borderColor: "#16A34A",
          }}
        >
          Activate
        </button>
      )}
      {mode === "edit" && (
        <button onClick={onEdit} style={btnPrimary()}>
          Save Changes
        </button>
      )}
      {mode === "create" && (
        <button onClick={onSave} style={btnPrimary()}>
          Save
        </button>
      )}
      <button
        onClick={onCancel}
        style={{
          width: "100%",
          padding: "7px 16px",
          fontSize: 12,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          background: "hsl(var(--muted))",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--border))")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
      >
        Cancel
      </button>
    </div>
  </>
);

// ─── USERS PANEL content ──────────────────────────────────────────────────────
const UsersPanelContent = ({
  users,
  onClose,
  onSelectUser,
  userSearch,
  setUserSearch,
  orgName,
}) => {
  const filtered = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      String(u.user_full_name || "")
        .toLowerCase()
        .includes(q) ||
      String(u.user_login_id || "")
        .toLowerCase()
        .includes(q)
    );
  });
  return (
    <>
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid hsl(var(--muted))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UsersIcon />
          </div>
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Users
            </h3>
            {orgName && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--brand-primary)",
                  margin: "1px 0 0",
                  fontWeight: 600,
                }}
              >
                of {smartCapitalize(orgName)}
              </p>
            )}
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {userSearch
                ? `${filtered.length} of ${users.length}`
                : `${users.length} member${users.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={iconBtnStyle()}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            padding: "7px 12px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name or login ID..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
          />
          {userSearch && (
            <button
              onClick={() => setUserSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                padding: 0,
                display: "flex",
              }}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {userSearch ? "No users match your search" : "No users found"}
            </p>
          </div>
        ) : (
          filtered.map((user, idx) => (
            <div
              key={user.userId}
              onClick={() => onSelectUser(user)}
              style={{
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                borderBottom:
                  idx < filtered.length - 1
                    ? "1px solid hsl(var(--background))"
                    : "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "hsl(var(--background))")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: avatarColor(user.userId),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: avatarColor(user.userId, 30),
                  flexShrink: 0,
                }}
              >
                {String(user.user_full_name || user.user_login_id || "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.user_full_name || user.user_login_id}
                </p>
              </div>
              <ChevronRightIcon />
            </div>
          ))
        )}
      </div>
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 9,
            fontSize: 12,
            fontWeight: 600,
            color: "hsl(var(--muted-foreground))",
            background: "hsl(var(--muted))",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
        >
          Close
        </button>
      </div>
    </>
  );
};

// ─── USER PROFILE PANEL content ───────────────────────────────────────────────
const UserProfileContent = ({ user, onBack, onClose }) => (
  <>
    <div
      style={{
        padding: "24px 24px 20px",
        background:
          "linear-gradient(135deg,hsl(var(--accent)) 0%,#F5F3FF 100%)",
        borderBottom: "1px solid hsl(var(--border))",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: avatarColor(user.userId),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 700,
          color: avatarColor(user.userId, 30),
          boxShadow:
            "0 0 0 3px hsl(var(--card)),0 0 0 5px rgba(99,102,241,0.15)",
          flexShrink: 0,
        }}
      >
        {String(user.user_login_id || "?")
          .charAt(0)
          .toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            margin: "0 0 6px",
            wordBreak: "break-word",
          }}
        >
          {user.user_login_id}
        </h3>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: user.is_active == 1 ? "#DCFCE7" : "#FEE2E2",
            color: user.is_active == 1 ? "#16A34A" : "#DC2626",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: user.is_active == 1 ? "#22C55E" : "#EF4444",
              display: "inline-block",
            }}
          />
          {user.is_active == 1 ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
    <div
      style={{
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1,
        overflowY: "auto",
      }}
    >
      {[
        { label: "User Login ID", value: user.user_login_id },
        { label: "Email", value: user.email },
        { label: "Contact No.", value: user.phone },
        { label: "Organization", value: user.Organizations },
        { label: "Role", value: user.Roles },
      ].map(({ label, value }) => (
        <div key={label}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 3px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "hsl(var(--foreground))",
              margin: 0,
              wordBreak: "break-all",
            }}
          >
            {value || "—"}
          </p>
        </div>
      ))}
    </div>
    <div
      style={{
        padding: "14px 24px",
        borderTop: "1px solid hsl(var(--muted))",
        display: "flex",
        gap: 8,
      }}
    >
      <button
        onClick={onBack}
        style={{
          flex: 1,
          padding: "9px 16px",
          fontSize: 12,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          background: "hsl(var(--muted))",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "hsl(var(--border))")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "hsl(var(--muted))")
        }
      >
        ← Back
      </button>
      <button
        onClick={onClose}
        style={{
          flex: 1,
          padding: "9px 16px",
          fontSize: 12,
          fontWeight: 600,
          color: "hsl(var(--card))",
          background: "var(--brand-primary)",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--brand-secondary)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "var(--brand-primary)")
        }
      >
        Close
      </button>
    </div>
  </>
);

// ─── MAP USERS PANEL content ───────────────────────────────────────────────
const MapUsersPanelContent = ({ node, onClose, onSaveMapping }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setSelectedUserIds([]);
        const res = await fetch("/api/organization/UserListGet", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAllUsers(data.users || []);
        } else {
          setAllUsers([]);
        }
      } catch (err) {
        console.error("Error fetching cisco users:", err);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [node.id]);

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      String(u.username || "")
        .toLowerCase()
        .includes(q) ||
      String(u.ciUserId || "")
        .toLowerCase()
        .includes(q)
    );
  });

  // ✅ FIX 1: individual toggle — sirf clicked user toggle hoga
  const toggleUser = (userId) => {
    setValidationError("");
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    setValidationError("");
    if (selectedUserIds.length === filtered.length && filtered.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map((u) => u.ciUserId));
    }
  };

 
const handleSave = async () => {
    if (selectedUserIds.length === 0) {
      setValidationError("Please select at least one user to map.");
      return;
    }
    setSaving(true);
    try {
      // Sirf selected users ke full objects nikalo
      const selectedUsers = allUsers.filter((u) =>
        selectedUserIds.includes(u.ciUserId)
      );
      await onSaveMapping(node.id, selectedUsers);
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((u) => selectedUserIds.includes(u.ciUserId));

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid hsl(var(--muted))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "hsl(var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkIcon />
          </div>
          <div>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Map Users
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "var(--brand-primary)",
                margin: "1px 0 0",
                fontWeight: 600,
              }}
            >
              {smartCapitalize(node.name)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={iconBtnStyle()}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <XIcon />
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid hsl(var(--muted))",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            padding: "7px 12px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                padding: 0,
                display: "flex",
              }}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Select All + Count */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            padding: "8px 20px",
            borderBottom: "1px solid hsl(var(--muted))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "hsl(var(--foreground))",
            }}
          >
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              style={{
                width: 14,
                height: 14,
                cursor: "pointer",
                accentColor: "var(--brand-primary)",
              }}
            />
            Select All
          </label>
          <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
            {selectedUserIds.length} selected
          </span>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div
          style={{
            padding: "8px 20px",
            background: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "#DC2626",
              margin: 0,
              fontWeight: 500,
            }}
          >
            ⚠ {validationError}
          </p>
        </div>
      )}

      {/* User List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              Loading users...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p
              style={{
                fontSize: 13,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
              }}
            >
              {search
                ? "No users match your search"
                : "No users available to map"}
            </p>
          </div>
        ) : (
          filtered.map((user, idx) => {
            const uid = user.ciUserId;
            const isChecked = selectedUserIds.includes(uid);
            const displayName = user.username || "Unknown";
            const loginId = user.agentLoginId || "";
            return (
              <div
                key={uid}
                onClick={() => toggleUser(uid)}
                style={{
                  padding: "10px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  borderBottom:
                    idx < filtered.length - 1
                      ? "1px solid hsl(var(--background))"
                      : "none",
                  background: isChecked ? "hsl(var(--accent))" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "hsl(var(--background))";
                }}
                onMouseLeave={(e) => {
                  if (!isChecked)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUser(uid)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 14,
                    height: 14,
                    cursor: "pointer",
                    accentColor: "var(--brand-primary)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "hsl(var(--foreground))",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </p>
                  {/* ✅ FIX 2: word-break so full agentLoginId wraps & shows completely */}
                  {loginId && (
                    <p
                      title={loginId}
                      style={{
                        fontSize: 11,
                        color: "hsl(var(--muted-foreground))",
                        margin: "1px 0 0",
                        wordBreak: "break-all",
                        whiteSpace: "normal",
                        lineHeight: 1.4,
                      }}
                    >
                      ({loginId})
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid hsl(var(--muted))",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnPrimary(),
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving
            ? "Saving..."
            : `Save Mapping${selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ""}`}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "7px 16px",
            fontSize: 12,
            fontWeight: 600,
            color: "hsl(var(--muted-foreground))",
            background: "hsl(var(--muted))",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "hsl(var(--muted))")
          }
        >
          Cancel
        </button>
      </div>
    </>
  );
};

// ─── COLUMN NODE CARD ─────────────────────────────────────────────────────────
const NodeCard = ({
  node,
  isSelected,
  onActionClick,
  onUsersClick,
  onArrowClick,
  onMapUsersClick,
  privilegeId,
  isRoot = false,
}) => {
  const isActive = node.isActive === 1;
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 8,
        marginBottom: 4,
        border: `1px solid ${isSelected ? "#BFDBFE" : "hsl(var(--border))"}`,
        background: isSelected ? "hsl(var(--accent))" : "hsl(var(--card))",
        cursor: "pointer",
        userSelect: "none",
        opacity: node.isDisabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "hsl(var(--background))";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "hsl(var(--card))";
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isActive ? "#22C55E" : "#EF4444",
          flexShrink: 0,
          display: "inline-block",
        }}
      />

      {/* Name */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: isSelected ? 600 : 500,
          color: node.isDisabled
            ? "hsl(var(--muted-foreground))"
            : isSelected
              ? "var(--brand-secondary)"
              : "hsl(var(--foreground))",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {smartCapitalize(node.name)}
      </span>

      {/* Action icons */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
      >
        {/* Settings / Action icon */}
        {privilegeId?.length > 1 && (
          <button
            title="Actions"
            onClick={(e) => {
              e.stopPropagation();
              if (!node.isDisabled) onActionClick(node);
            }}
            style={{
              ...iconBtnStyle(22),
              color: "hsl(var(--muted-foreground))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <SettingsIcon />
          </button>
        )}
        {/* Users icon */}
        <button
          title="View Users"
          onClick={(e) => {
            e.stopPropagation();
            onUsersClick(node);
          }}
          style={{ ...iconBtnStyle(22), color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <UserIcon />
        </button>
        {/* Map Users icon */}
        <button
          title="Map Users to Organization"
          onClick={(e) => {
            e.stopPropagation();
            if (!node.isDisabled) onMapUsersClick(node);
          }}
          style={{ ...iconBtnStyle(22), color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "hsl(var(--border))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <LinkIcon size={13} />
        </button>
        {/* Arrow - only if has children and NOT root */}
        {hasChildren && !isRoot && (
          <button
            title="View Children"
            onClick={(e) => {
              e.stopPropagation();
              onArrowClick(node);
            }}
            style={{
              ...iconBtnStyle(22),
              color: isSelected
                ? "var(--brand-primary)"
                : "hsl(var(--muted-foreground))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "hsl(var(--border))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <ChevronRightIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── COLUMN ───────────────────────────────────────────────────────────────────
const OrgColumn = ({
  nodes,
  selectedNodeId,
  onActionClick,
  onUsersClick,
  onArrowClick,
  onMapUsersClick,
  privilegeId,
  isFirstColumn = false,
}) => {
  if (isFirstColumn && nodes.length > 0) {
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1);
    return (
      <div
        style={{
          width: 230,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "hsl(var(--background))",
          borderRadius: 10,
          border: "1px solid hsl(var(--border))",
          overflow: "hidden",
        }}
      >
        {/* Root node - highlighted section */}
        <div
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent)))",
            padding: "10px 8px 6px",
            borderBottom: "2px solid #BFDBFE",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--brand-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 5,
              paddingLeft: 4,
            }}
          >
            Root
          </div>
          <NodeCard
            node={rootNode}
            isSelected={selectedNodeId === rootNode.id}
            onActionClick={onActionClick}
            onUsersClick={onUsersClick}
            onArrowClick={onArrowClick}
            onMapUsersClick={onMapUsersClick}
            privilegeId={privilegeId}
            isRoot={true}
          />
        </div>
        {/* Children nodes */}
        <div style={{ padding: "6px 8px", flex: 1, overflowY: "auto" }}>
          {childNodes.length === 0 ? (
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--border))",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              No children
            </p>
          ) : (
            childNodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onActionClick={onActionClick}
                onUsersClick={onUsersClick}
                onArrowClick={onArrowClick}
                onMapUsersClick={onMapUsersClick}
                privilegeId={privilegeId}
              />
            ))
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "hsl(var(--background))",
        borderRadius: 10,
        border: "1px solid hsl(var(--border))",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {nodes.length === 0 ? (
          <p
            style={{
              fontSize: 11,
              color: "hsl(var(--border))",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No items
          </p>
        ) : (
          nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onActionClick={onActionClick}
              onUsersClick={onUsersClick}
              onArrowClick={onArrowClick}
              onMapUsersClick={onMapUsersClick}
              privilegeId={privilegeId}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const Page = () => {
  const [root, setRoot] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [privilegeId, setPrivilegeId] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [orgCounts, setOrgCounts] = useState({ Active: 0, Inactive: 0 });

  // Column path: array of { node, children[] }
  const [columns, setColumns] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]);

  // Right panel state
  const [rightPanel, setRightPanel] = useState(null);

  // Action panel form state
  const [actionNode, setActionNode] = useState(null);
  const [mode, setMode] = useState("view");
  const [newChildName, setNewChildName] = useState("");
  const [newChildDesc, setNewChildDesc] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showAssociationError, setShowAssociationError] = useState(false);

  const router = useRouter();
  const scrollRef = useRef(null);

  const hasPrivilege = React.useCallback(
    (id) => privileges.some((p) => p.PrivilegeId === id),
    [privileges],
  );

  // ── fetch privileges
  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          userId =
            JSON.parse(bytes.toString(CryptoJS.enc.Utf8))?.userId || null;
          userId =
            JSON.parse(bytes.toString(CryptoJS.enc.Utf8))?.userId || null;
        }
        const res = await fetch("/api/privileges", { method: "GET", 
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, 
            loggedInUserId: userId,
            moduleId: 8, 
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          }, 
          cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPrivilegeId(data.privileges.map((p) => p.PrivilegeId));
        setPrivileges(data.privileges || []);
      } catch {
        console.error("");
      } finally {
        setPrivilegesLoaded(true);
      }
    };
    fetchPrivileges();
  }, []);

  // ── fetch org tree
  const fetchOrganization = async () => {
    try {
      const res = await fetch("/api/organization/root", { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
      const res = await fetch("/api/organization/root", { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        const allNodes = data.organizations || [];
        const rootNode = allNodes.find((o) => o.id === 1) || { children: [] };
        setRoot(rootNode);
        const tree = transformDataForTree(allNodes);
        setTreeData(tree);
        setOrgCounts(data.counts || {});
        if (tree) {
          const firstCol = [tree, ...(tree.children || [])];
          setColumns([firstCol]);
        }
      }
    }  
  }catch(err){
    console.log(err);
  }
  };

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) fetchOrganization();
  }, [privilegesLoaded, hasPrivilege]);

  // auto-scroll right when new column added
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [columns.length]);

  if (!privilegesLoaded)
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (privilegesLoaded && !hasPrivilege(1)) return notFound();

  // ── Arrow click → expand column
  const handleArrowClick = (node) => {
    const colIndex = columns.findIndex((col) =>
      col.some((n) => n.id === node.id),
    );
    if (colIndex === -1) return;
    const newColumns = columns.slice(0, colIndex + 1);
    const newPath = selectedPath.slice(0, colIndex);
    newPath[colIndex] = node.id;
    if (node.children && node.children.length > 0) {
      newColumns.push(node.children);
    }
    setColumns(newColumns);
    setSelectedPath(newPath);
  };

  // ── Action icon click → fetch details and show action panel
  const handleActionClick = async (node) => {
    try {
      const [orgRes, usersRes] = await Promise.all([
        fetch(`/api/organization/DescriptionGet/${node.id}`, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" }),
        fetch(`/api/organization/UserDeatilsGet/${node.id}`, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" }),
      ]);
      const orgData = await orgRes.json();
      if (orgRes.ok && orgData.success) {
        const fullNode = {
          id: node.id,
          name: orgData.organization.Name,
          description: orgData.organization.Description,
          isActive: Number(orgData.organization.isActive),
          isDisabled: node.isDisabled,
        };
        setActionNode(fullNode);
        setNewChildName(orgData.organization.Name);
        setNewChildDesc(orgData.organization.Description);
        setMode("view");
        setRightPanel({ type: "action" });
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  // ── Users icon click → show users panel
  const handleUsersClick = async (node) => {
    try {
      const res = await fetch(`/api/organization/UserDeatilsGet/${node.id}`, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" });
      const data = await res.json();
      const users = res.ok && data.success ? data.users : [];
      setUserSearch("");
      setRightPanel({ type: "users", users, node, orgName: node.name });
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  // ── Map Users icon click → show map users panel
  const handleMapUsersClick = (node) => {
    setRightPanel({ type: "mapUsers", node });
  };

  // ── Save mapping API call
 // ─── Page component mein handleSaveMapping ko replace karo ───
const handleSaveMapping = async (organizationId, users) => {
    try {
      const createdBy = getUserId();
      const res = await fetch("/api/organization/UserMappingSave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          organizationId,
          createdBy, 
          users: users.map((u) => ({
            ciUserId: u.ciUserId,
            agentLoginId: u.agentLoginId,
            username: u.username,
            userProfile: u.UserProfile,        // procedure mein UserProfile
            userProfileId: u.userProfileId,
            email: u.email,
          })),
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || "Users mapped successfully!");
        closePanel();
      } else {
        alert(`Failed: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Close panel
  const closePanel = () => {
    setRightPanel(null);
    setActionNode(null);
    setMode("view");
  };

  // ── Save new child
  const addChild = async () => {
    if (!actionNode) return;
    if (/[^a-zA-Z0-9 ]/.test(newChildName)) {
      alert("Organization name must not contain special characters.");
      return;
    }
    if (!newChildName.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    if (newChildName.length > 20) {
      alert("Max 20 characters for name.");
      return;
    }
    const userId = getUserId();
    try {
      const res = await fetch("/api/organization", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, body: JSON.stringify({ name: newChildName, description: newChildDesc, parentId: actionNode.id, userId }), cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        closePanel();
        await fetchOrganization();
      } else alert(`Failed: ${data.message}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Edit node
  const editChild = async () => {
    if (!actionNode) return;
    if (/[^a-zA-Z0-9 ]/.test(newChildName)) {
      alert("No special characters allowed.");
      return;
    }
    if (!newChildName.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    if (newChildName.length > 20) {
      alert("Max 20 characters.");
      return;
    }
    const userId = getUserId();
    try {
      const res = await fetch(`/api/organization/EditChild/${actionNode.id}`, { method: "Post", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, body: JSON.stringify({ name: newChildName, description: newChildDesc, userId, OrganizationId: actionNode.id, isActive: actionNode.isActive ? 1 : 0 }), cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        closePanel();
        await fetchOrganization();
      } else alert(`Failed: ${data.message}`);
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  // ── Delete node
  const deleteNode = async () => {
    if (!actionNode) return;
    if (!window.confirm("Are you sure you want to delete this organization?"))
      return;
    try {
      const res = await fetch(`/api/organization/Delete/${actionNode.id}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Deleted successfully.");
        closePanel();
        await fetchOrganization();
      } else {
        if (data.statusCode === 403) {
          setShowAssociationError(true);
          return;
        }
        alert(data.message || "Unknown error");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Toggle activation
  const toggleActivation = async (activate) => {
    if (!actionNode) return;
    if (
      !activate &&
      !window.confirm(
        "Deactivate this organization? All children will be affected.",
      )
    )
      return;
    if (!activate) {
      try {
        const checkRes = await fetch("/api/organization/checkOrgAssociation", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, body: JSON.stringify({ OrgId: actionNode.id }), cache: "no-store" });
        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.success && checkData.isAssociated) {
          setShowAssociationError(true);
          return;
        }
      } catch {
        console.error("");
      }
    }
    const userId = getUserId();
    try {
      const res = await fetch(`/api/organization/EditIsActive/${actionNode.id}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, orgId: sessionStorage.getItem("selectedOrgId") || "" }, body: JSON.stringify({ userId, OrganizationId: actionNode.id, isActive: activate ? 1 : 0 }), cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Organization ${activate ? "activated" : "deactivated"}!`);
        closePanel();
        await fetchOrganization();
      } else alert(`Failed: ${data.message}`);
    } catch {
      alert("Something went wrong.");
    }
  };

  // Path breadcrumb
  const breadcrumb = selectedPath.reduce((acc, nodeId, i) => {
    const col = columns[i] || [];
    const n = col.find((x) => x.id === nodeId);
    if (n) acc.push(smartCapitalize(n.name));
    return acc;
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "hsl(var(--background))",
      }}
    >
      {/* ── TOP BAR */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 20px",
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "hsl(var(--foreground))",
              margin: 0,
            }}
          >
            ORGANIZATION MANAGER
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22C55E",
                display: "inline-block",
              }}
            />{" "}
            Active{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              {orgCounts?.Active ?? 0}
            </strong>
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#EF4444",
                display: "inline-block",
              }}
            />{" "}
            Inactive{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              {orgCounts?.Inactive ?? 0}
            </strong>
          </span>
          <button
            onClick={() => {
              setColumns(
                treeData ? [[treeData, ...(treeData.children || [])]] : [],
              );
              setSelectedPath([]);
              closePanel();
            }}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "hsl(var(--foreground))",
              background: "hsl(var(--muted))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── COLUMNS AREA */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            display: "flex",
            gap: 12,
            padding: 16,
            overflowX: "auto",
            overflowY: "hidden",
            paddingRight: rightPanel ? 356 : 16,
          }}
        >
          {columns.map((colNodes, colIdx) => (
            <OrgColumn
              key={colIdx}
              nodes={colNodes}
              selectedNodeId={selectedPath[colIdx]}
              onActionClick={handleActionClick}
              onUsersClick={handleUsersClick}
              onArrowClick={handleArrowClick}
              onMapUsersClick={handleMapUsersClick}
              privilegeId={privilegeId}
              isFirstColumn={colIdx === 0}
            />
          ))}
        </div>

        {/* ── BREADCRUMB */}
        {breadcrumb.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              padding: "6px 20px",
              borderTop: "1px solid hsl(var(--muted))",
              background: "hsl(var(--card))",
              fontSize: 11,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Path: {breadcrumb.join(" › ")}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL */}
      <RightPanel
        content={
          rightPanel?.type === "action" && actionNode ? (
            <ActionPanelContent
              node={actionNode}
              mode={mode}
              setMode={setMode}
              newChildName={newChildName}
              setNewChildName={setNewChildName}
              newChildDesc={newChildDesc}
              setNewChildDesc={setNewChildDesc}
              onSave={addChild}
              onEdit={editChild}
              onDelete={deleteNode}
              onActivate={() => toggleActivation(true)}
              onDeactivate={() => toggleActivation(false)}
              onCancel={closePanel}
              privilegeId={privilegeId}
            />
          ) : rightPanel?.type === "users" ? (
            <UsersPanelContent
              users={rightPanel.users}
              onClose={closePanel}
              orgName={rightPanel.orgName}
              onSelectUser={(u) =>
                setRightPanel({
                  ...rightPanel,
                  type: "profile",
                  selectedUser: u,
                })
              }
              userSearch={userSearch}
              setUserSearch={setUserSearch}
            />
          ) : rightPanel?.type === "profile" ? (
            <UserProfileContent
              user={rightPanel.selectedUser}
              onBack={() => setRightPanel({ ...rightPanel, type: "users" })}
              onClose={closePanel}
            />
          ) : rightPanel?.type === "mapUsers" ? (
            <MapUsersPanelContent
              node={rightPanel.node}
              onClose={closePanel}
              onSaveMapping={handleSaveMapping}
            />
          ) : null
        }
        onClose={closePanel}
      />

      {/* ── ASSOCIATION ERROR MODAL */}
      {showAssociationError && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "hsl(var(--card))",
              padding: 24,
              borderRadius: 12,
              textAlign: "center",
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <p
              style={{
                marginBottom: 20,
                fontSize: 13,
                color: "hsl(var(--foreground))",
              }}
            >
              This organization or its children may be associated with users.
              Please de-associate them first.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button
                onClick={() => setShowAssociationError(false)}
                style={{
                  padding: "9px 20px",
                  background: "hsl(var(--muted))",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAssociationError(false);
                  router.push("/dashboard/users");
                }}
                style={{
                  padding: "9px 20px",
                  background: "var(--brand-primary)",
                  color: "hsl(var(--card))",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Go to Users Page
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:hsl(var(--muted)); border-radius:10px; }
        ::-webkit-scrollbar-thumb { background:hsl(var(--border)); border-radius:10px; }
      `}</style>
    </div>
  );
};

export default withAuth(Page);

// ─── UTIL ─────────────────────────────────────────────────────────────────────
function getUserId() {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))?.userId || null;
  } catch {
    return null;
  }
}

// ─── MINI STYLE HELPERS ───────────────────────────────────────────────────────
function iconBtnStyle(size = 28) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  };
}
function inputStyle(disabled) {
  return {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    color: disabled ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
    background: disabled ? "hsl(var(--background))" : "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    outline: "none",
    cursor: disabled ? "default" : "text",
    boxSizing: "border-box",
  };
}
function btnPrimary() {
  return {
    width: "100%",
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "hsl(var(--card))",
    background: "var(--brand-primary)",
    border: "1px solid var(--brand-primary)",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "background 0.15s",
  };
}
function btnSm(color, bg) {
  return {
    flex: 1,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 600,
    color,
    background: bg,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s",
  };
}

// ─── FIELD WRAPPER ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
function XIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 14 14"
    >
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}
function ChevronRightIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function PlusIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 12 12"
    >
      <path d="M6 1v10M1 6h10" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="var(--brand-primary)"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
      />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="hsl(var(--muted-foreground))"
      strokeWidth="2"
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
      />
    </svg>
  );
}
function LinkIcon({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}