"use client";
import { useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import withAuth from "@/components/withAuth";
import NotFound from "@/components/NotFound";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
const UpdateUserPage = ({ params }) => {
  const { id } = params;
  const [user, setUser] = useState(null);
  const [agentRoles, setAgentRoles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [hasAccess, setHasAccess] = useState(null);

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

  const fetchPrivilege = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      sessionStorage.removeItem("interactionDateRange");
      sessionStorage.removeItem("selectedCallStatus");
      let userRole = null;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userRole = user?.userId || null;
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
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok) {
        const privileges = data.PrivilegeList || [];
        const hasViewPermission = privileges.some(
          (privilege) => privilege.PrivilegeId === 3,
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
  }, [router]); // include `router` because you use it inside

  useEffect(() => {
    fetchPrivilege();
  }, [fetchPrivilege]); // ✅ SAFE: no warning now!

  const ValidationSchema = z.object({
    loginId: z
      .string()
      .trim()
      .min(5, "User loginId must be at least 5 characters long")
      .max(50, "User loginId length exceeded"),
    email: z
      .string()
      .trim()
      .max(50, "Email length exceeded.")
      .optional()
      .or(z.literal("")) // ✅ allow empty string
      .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: "Invalid email address",
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
      // .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
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
    const fetchData = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");

        let currentUserId = null;
        if (encryptedUserData) {
          try {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const user = JSON.parse(decryptedData);
            currentUserId = user?.userId || null;
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }
        const res = await fetch(`/api/users/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: currentUserId,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
          cache: "no-store",
        });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`Error fetching user: ${res.statusText}`);
        const data = await res.json();
        setUser(data.user);
        const preSelectedRoles = data.user.roles.map((role) => ({
          value: role.roleId,
          label: role.roleName,
        }));
        const targetIsSuperAdmin = preSelectedRoles.some(
          (r) => Number(r.value) === 112
        );
        if (targetIsSuperAdmin && !isSuperAdmin) {
          setNotFound(true);
          return;
        }
        setSelectedRoles(preSelectedRoles);
        const preSelectedOrganizations = data.user.organizations.map((org) => ({
          value: org.orgId,
          label: org.orgName,
        }));
        setSelectedOrganizations(preSelectedOrganizations);
      } catch (error) {
        console.error(`Error fetching user:, ${error}`);
        setErrors((prevErrors) => ({
          ...prevErrors,
          global: "Failed to fetch user details.",
        }));
      }
    };
    fetchData();
  }, [id]);
  useEffect(() => {
    if (hasAccess !== true) return;
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/userRoles", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
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
    fetchRoles();
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
      setSelectedRoles([agentRole]);
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
  // const hasAgentRole = (roles) => roles.some((role) => role.value === 4);
  if (notFound) {
    return (
      <NotFound
        message="The user you are trying to edit does not exist."
        redirectUrl="/dashboard/Management_combined_page?tab=users"
        redirectText="Go Back"
      />
    );
  }
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
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
    const mappedRoles = selectedRoles.map((role) => ({
      roleId: role.value,
    }));
    const mappedOrgIds = selectedOrganizations.map((org) => ({
      orgId: org.value,
    }));
    const formData = {
      loginId: event.target.Username.value,
      email: event.target.email.value,
      userFullName: event.target.userFullName.value,
      phone: event.target.phone.value,
      userAddress: event.target.userAddress.value,
      isActive: event.target.isActive.value === "true",
      orgIds: mappedOrgIds,
      rolesIds: mappedRoles,
      currentUserId,
      currentUserName,
    };
    try {
      ValidationSchema.parse(formData);
      const response = await fetch(`/api/users/update/${user.userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        body: JSON.stringify(formData),
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok && result.success === true) {
        alert(result.message || "User updated successfully.");
        router.push("/dashboard/Management_combined_page?tab=users");
      } else {
        alert(result.message || "An unexpected error occurred.");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce((acc, err) => {
          acc[err.path[0]] = err.message;
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
        console.error(`Error in handleSubmit: ${error.message}`);
        alert(
          error.message ||
            "An unexpected error occurred while creating the user.",
        );
      }
    }
  };
  if (!user) {
    return <p>Loading...</p>;
  }
  const errorStyle = {
    color: "red",
    fontSize: "0.675rem",
  };
  return (
    <div className="h-screen overflow-y-auto p-4">
      <form onSubmit={handleSubmit} className="overflow-x-auto">
        <div className="min-w-[640px] mx-auto grid max-w-[90rem] flex-1 auto-rows-max gap-4 px-4">
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
              Update User
            </h1>
            <div className=" items-center gap-2 md:ml-auto md:flex">
              <Button
                size="sm"
                className="shadow-md"
                type="submit"
                name="status"
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
          {errors.global && (
            <p style={errorStyle} className="text-center">
              {errors.global}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
            <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="Username" className="text-xs">
                        User LoginId
                      </Label>
                      <Input
                        value={user.loginId}
                        name="Username"
                        type="text"
                        className="w-full"
                        maxLength={50}
                        // onChange={(e) => {
                        //   const sanitizedValue = e.target.value.replace(
                        //     /[^a-zA-Z0-9\s]/g,
                        //     ""
                        //   ); // Allow letters, numbers, and spaces
                        //   setUser((prevState) => ({
                        //     ...prevState,
                        //     loginId: sanitizedValue, // Update the state with the sanitized value
                        //   }));
                        // }}
                        onChange={(e) =>
                          setUser((prevState) => ({
                            ...prevState,
                            loginId: e.target.value,
                          }))
                        }
                        // disabled={hasAgentRole(selectedRoles)} // Disable if Agent role exists
                        disabled={true}
                      />
                      {errors.loginId && (
                        <p style={errorStyle}>{errors.loginId}</p>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="userFullName" className="text-xs">
                        User Name
                      </Label>
                      <Input
                        value={user.userFullName}
                        name="userFullName"
                        type="text"
                        className="w-full"
                        maxLength={50}
                        // onChange={(e) => {
                        //   const sanitizedValue = e.target.value.replace(
                        //     /[^a-zA-Z0-9\s]/g,
                        //     ""
                        //   ); // Allow letters, numbers, and spaces
                        //   setUser((prevState) => ({
                        //     ...prevState,
                        //     userFullName: sanitizedValue, // Update the state with the sanitized value
                        //   }));
                        // }}
                        onChange={(e) =>
                          setUser((prevState) => ({
                            ...prevState,
                            userFullName: e.target.value,
                          }))
                        }
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
                        value={user.email}
                        name="email"
                        type="email"
                        className="w-full"
                        maxLength={50}
                        onChange={(e) =>
                          setUser((prevState) => ({
                            ...prevState,
                            email: e.target.value,
                          }))
                        }
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
                        // placeholder="1234567890"
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, ""); // remove non-digits
                        }}
                        value={user.phone}
                        onChange={(e) =>
                          setUser((prevState) => ({
                            ...prevState,
                            phone: e.target.value,
                          }))
                        }
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
                        value={user.userAddress}
                        maxLength={512}
                        onChange={(e) =>
                          setUser((prevState) => ({
                            ...prevState,
                            userAddress: e.target.value,
                          }))
                        }
                      />
                      {errors.userAddress && (
                        <p style={errorStyle}>{errors.userAddress}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid auto-rows-max items-start gap-4">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="grid gap-6 w-full max-w-full">
                    <div className="grid gap-3">
                      <Label className="text-xs">Roles</Label>
                      <div>
                        <RoleMultiSelect
                          roles={roles}
                          selectedRoles={selectedRoles}
                          onChange={handleRoleChange}
                          // error={errors.rolesIds}
                        />
                      </div>

                      {errors.rolesIds && (
                        <p style={errorStyle}>{errors.rolesIds}</p>
                      )}
                    </div>
                    {selectedRoles.some((role) => role.label === "Agent") && (
                      <p className="text-xs text-primary mt-1">
                        Only one role and one organization can be selected for
                        AGENT.
                      </p>
                    )}
                    <div className="grid gap-3">
                      <Label className="text-xs">Organization</Label>
                      <TreeDropdown
                        selected={selectedOrganizations}
                        onChange={handleOrganizationChange}
                        isMulti={!isAgentRole(selectedRoles)}
                      />
                      {errors.orgIds && (
                        <p style={errorStyle}>{errors.orgIds}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid auto-rows-max items-start gap-4">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xs">User Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="isActive" className="text-xs">
                          Status
                        </Label>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="isActive"
                              value="true"
                              className="form-radio"
                              checked={user.isActive === true}
                              onChange={() =>
                                setUser((prev) => ({
                                  ...prev,
                                  isActive: true,
                                }))
                              }
                            />
                            <span className="text-xs">Active</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="isActive"
                              value="false"
                              className="form-radio"
                              checked={user.isActive === false}
                              onChange={() =>
                                setUser((prev) => ({
                                  ...prev,
                                  isActive: false,
                                }))
                              }
                            />
                            <span className="text-xs">Inactive</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
export default withAuth(UpdateUserPage);
