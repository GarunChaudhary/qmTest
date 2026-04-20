"use client";
import { ChevronLeft } from "lucide-react";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import withAuth from "@/components/withAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { z } from "zod";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";

const AddUserPage = () => {
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [agentRoles, setAgentRoles] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [resetKey, setResetKey] = useState(0);
  const [hasAccess, setHasAccess] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const strictEmailRegex =
    /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const ValidationSchema = z.object({
    Username: z
      .string()
      .trim()
      .min(5, "User loginId must be at least 5 characters long")
      .max(50, "User loginId length exceeded"),
    email: z
      .string()
      .trim()
      .max(50, "Email length exceeded.")
      .optional()
      .refine((val) => !val || strictEmailRegex.test(val), {
        message: "Invalid email format.",
      }),

    userFullName: z
      .string()
      .trim()
      .nonempty("User name is required")
      .max(50, "User name length exceeded"),
    phone: z
      .string()
      .trim()
      .optional()
      // .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
      // .nonempty("Phone number is required"),
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Phone number must be exactly 10 digits",
      }),

    userAddress: z
      .string()
      .trim()
      // .nonempty("Address is required")
      .max(512, "Address length exceeded")
      .refine((val) => !/https?:\/\/[^\s]+/.test(val), {
        message: "Address must not contain a URL",
      }),
    rolesIds: z
      .array(
        z.object({
          roleId: z.number().positive(),
        }),
      )
      .min(1, "At least one role is required"),
    orgIds: z
      .array(
        z.object({
          orgId: z.number().positive(),
        }),
      )
      .min(1, "At least one organization must be selected."),
  });

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

  useEffect(() => {
    const encryptedUserData = sessionStorage.getItem("user");
    if (!encryptedUserData) return;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const roles = user?.userRoles || [];
      const superAdmin =
        Array.isArray(roles) && roles.some((r) => Number(r?.roleId) === 112);
      setIsSuperAdmin(superAdmin);
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  const isAgentRole = (rolesArray) =>
    rolesArray.some((role) => agentRoles.includes(Number(role.value)));
  useEffect(() => {
    const fetchPrivilege = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userRole = null;
        let orgId = null;

        if (encryptedUserData) {
          try {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const user = JSON.parse(decryptedData);
            userRole = user?.userId || null;
            orgId = user?.organization?.[0]?.orgId || null;
            if (!orgId) {
          const storedOrgId = sessionStorage.getItem("selectedOrgId");
          orgId = storedOrgId ? Number(storedOrgId) : null;
        }

        if (!orgId) {
          throw new Error("Organization not selected");
        }
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }

      const response = await fetch("/api/moduleswithPrivileges", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userRole,
          moduleId: 2,
          orgId: orgId,
        },
        cache: "no-store",
      });

        const data = await response.json();

        if (response.ok) {
          const privileges = data.PrivilegeList || [];
          const hasViewPermission = privileges.some(
            (privilege) => privilege.PrivilegeId === 2,
          );

          if (hasViewPermission) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
            router.replace("/not-found");
          }
        } else {
          setHasAccess(false);
          router.replace("/not-found");
        }
      } catch (error) {
        console.error("Error fetching privileges:", error);
        setHasAccess(false);
        router.replace("/not-found");
      }
    };
    fetchPrivilege();
  }, [router]);

  useEffect(() => {
    if (hasAccess !== true) return;
    const loadRoles = async () => {
      try {
        const response = await fetch("/api/userRoles", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch roles: ${response.statusText}`);
        }
        const data = await response.json();
        const incoming = data.roles || [];
        setRoles(isSuperAdmin ? incoming : incoming.filter((r) => Number(r.roleId) !== 112));
      } catch (error) {
        console.error(`Error fetching roles:, ${error}`);
        setErrors((prevErrors) => ({
          ...prevErrors,
          global: "Failed to load roles. Please try again later.",
        }));
      }
    };

    loadRoles();
  }, [hasAccess]);

  if (hasAccess === null) {
    return <div className="text-xs">Loading...</div>;
  }
  if (hasAccess === false) {
    return null;
  }

  const handleRoleChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedRoles([]);
      return;
    }

    if (!isSuperAdmin) {
      selectedOptions = selectedOptions.filter((r) => Number(r.value) !== 112);
    }

    const agentRole = selectedOptions.find((role) =>
      agentRoles.includes(Number(role.value)),
    );

    if (agentRole) {
      // If AGENT is selected, restrict to AGENT only
      setSelectedRoles([agentRole]);
      // Also, limit orgs to one if more than one was selected
      if (selectedOrganizations.length > 1) {
        setSelectedOrganizations([selectedOrganizations[0]]);
      }
    } else {
      setSelectedRoles(selectedOptions);
    }
  };

  const handleOrganizationChange = (selectedOptions) => {
    const isAgentSelected = isAgentRole(selectedRoles);

    if (isAgentSelected) {
      const firstOption = Array.isArray(selectedOptions)
        ? selectedOptions[0]
        : selectedOptions;
      setSelectedOrganizations(firstOption ? [firstOption] : []);
    } else {
      setSelectedOrganizations(selectedOptions || []);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const encryptedUserData = sessionStorage.getItem("user");
    let currentUserId = null;
    let currentUserName = null;
    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        currentUserId = user?.userId || null;
        currentUserName = user?.userFullName || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
      }
    }
    const mappedRoleIds = selectedRoles.map((role) => ({
      roleId: role.value,
    }));
    const mappedOrgIds = selectedOrganizations.map((org) => ({
      orgId: org.value,
    }));

    const data = {
      ...Object.fromEntries(new FormData(event.target).entries()),
      email: event.target.email.value.toLowerCase(),
      loginId: event.target.Username.value,
      // password: "India@123",
      rolesIds: mappedRoleIds,
      orgIds: mappedOrgIds,
      currentUserId,
    };
    try {
      ValidationSchema.parse(data); // Validate the data
      const response = await fetch("/api/users/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        body: JSON.stringify({
          ...data,
          currentUserId,
          currentUserName,
        }),
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok && result.success) {
        alert(result.message || "User created successfully.");
        router.push("/dashboard/Management_combined_page?tab=users");
      } else {
        alert(result.message || "An unexpected error occurred.");
      }
    } catch (error) {
      // if (error instanceof z.ZodError) {
      //   const fieldErrors = error.errors.reduce((acc, err) => {
      //     acc[err.path[0]] = err.message;
      //     return acc;
      //   }, {});
      //   setErrors(fieldErrors);
      // }
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce((acc, err) => {
          acc[err.path[0]] = err.message;

          // Clear this specific error after 3 seconds
          setTimeout(() => {
            setErrors((prevErrors) => {
              const { [err.path[0]]: _, ...rest } = prevErrors;
              return rest;
            });
          }, 3000);

          return acc;
        }, {});
        setErrors(fieldErrors);
      } else {
        console.error("Error in handleSubmit:", error.message);
        alert(
          error.message ||
            "An unexpected error occurred while creating the user.",
        );
      }
    }
  };
  const handleDiscard = () => {
    const form = document.querySelector("form");
    if (form) form.reset(); // Reset the form fields
    setSelectedRoles([]); // Clear selected roles
    setSelectedOrganizations([]); // Clear selected organizations
    setErrors({}); // Clear all validation errors
    setResetKey((prevKey) => prevKey + 1);
  };
  const errorStyle = {
    color: "red",
    fontSize: "0.675rem",
  };
  return (
    <div className="h-screen overflow-y-auto p-4">
      <form onSubmit={handleSubmit} className="overflow-x-auto">
        <div className="min-w-[640px] mx-auto grid max-w-[90rem] flex-1 auto-rows-max gap-4 px-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard/Management_combined_page?tab=users" passHref>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shadow-md hover:bg-[var(--brand-secondary)]"
                style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight sm:grow-0">
              Add User
            </h1>
            <div className="items-center gap-2 md:ml-auto md:flex">
              <Button
                variant="destructive"
                size="sm"
                className="shadow-md"
                type="button"
                onClick={handleDiscard}
                style={{ backgroundColor: "#F04E23" }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#F04E23")
                }
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="shadow-md"
                type="submit"
                name="isActive"
                value={true}
                style={{ backgroundColor: "var(--brand-primary)" }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                }
              >
                Save User
              </Button>
            </div>
          </div>

          {/* Global error */}
          {errors.global && (
            <p style={errorStyle} className="text-center">
              {errors.global}
            </p>
          )}

          {/* Main Grid */}
          <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
            {/* Left Column */}
            <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="Username" className="text-xs">
                        User LoginId
                      </Label>
                      <Input
                        name="Username"
                        type="text"
                        className="w-full"
                        maxLength={50}
                        // onChange={(e) => {
                        //   const value = e.target.value.replace(
                        //     /[^a-zA-Z0-9\s]/g,
                        //     ""
                        //   );
                        //   e.target.value = value;
                        // }}
                      />
                      {errors.Username && (
                        <p style={errorStyle}>{errors.Username}</p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="userFullName" className="text-xs">
                        User Name
                      </Label>
                      <Input
                        name="userFullName"
                        type="text"
                        className="w-full"
                        maxLength={50}
                        // onChange={(e) => {
                        //   const value = e.target.value.replace(
                        //     /[^a-zA-Z0-9\s]/g,
                        //     "",
                        //   );
                        //   e.target.value = value;
                        // }}
                      />
                      {errors.userFullName && (
                        <p style={errorStyle}>{errors.userFullName}</p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        name="email"
                        type="email"
                        className="w-full"
                        maxLength={50}
                      />
                      {errors.email && <p style={errorStyle}>{errors.email}</p>}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="phone" className="text-xs">
                        Phone
                      </Label>
                      <Input
                        name="phone"
                        type="tel"
                        maxLength={10}
                        pattern="\d*"
                        className="w-full"
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, "");
                        }}
                      />
                      {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="userAddress" className="text-xs">
                        Address
                      </Label>
                      <Input
                        name="userAddress"
                        type="text"
                        className="w-full"
                        maxLength={512}
                      />
                      {errors.userAddress && (
                        <p style={errorStyle}>{errors.userAddress}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="grid auto-rows-max items-start gap-4">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="grid gap-6 w-full max-w-full">
                    <div className="grid gap-3">
                      <Label htmlFor="rolesIds" className="text-xs">
                        Role
                      </Label>
                      <div>
                        <RoleMultiSelect
                          roles={roles}
                          selectedRoles={selectedRoles}
                          onChange={handleRoleChange}
                        />
                      </div>
                      {selectedRoles.some((role) => role.label === "Agent") && (
                        <p className="text-xs text-primary mt-1">
                          Only one role and one organization can be selected for
                          AGENT.
                        </p>
                      )}
                      {errors.rolesIds && (
                        <p style={errorStyle}>{errors.rolesIds}</p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="organizations" className="text-xs">
                        Organizations
                      </Label>
                      <TreeDropdown
                        key={resetKey}
                        value={selectedOrganizations}
                        onChange={handleOrganizationChange}
                        className="text-xs"
                        isMulti={!isAgentRole(selectedRoles)}
                      />
                      {errors.orgIds && (
                        <p style={errorStyle}>{errors.orgIds}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
export default withAuth(AddUserPage);

