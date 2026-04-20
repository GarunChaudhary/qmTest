"use client";
import { useState, useEffect, useCallback } from "react";
import CryptoJS from "crypto-js";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NotFound from "@/components/NotFound";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import withAuth from "@/components/withAuth";
import TreeDropdown from "@/components/organizationTreeDDL";
const EditAgentOrganizationPage = ({ params }) => {
  const { id } = params;
  const [mapping, setMapping] = useState(null);
  const [selectedOrganization, setSelectedOrganization] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [errors, setErrors] = useState({});
  const [notFound, setNotFound] = useState(false); // State to track 404
  const [hasAccess, setHasAccess] = useState(null);

  const router = useRouter();

  // const fetchPrivilege = async () => {
  const fetchPrivilege = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      // ✅ Clear interactionDateRange after user validation
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
          moduleId: 4,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        const privileges = data.PrivilegeList || [];
        const hasViewPermission = privileges.some(
          (privilege) => privilege.PrivilegeId === 3
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
  }, [router]); // 👈 because it uses `router`

  useEffect(() => {
    fetchPrivilege();
  }, [fetchPrivilege]);

  useEffect(() => {
    if (!id) {
      setErrors((prev) => ({
        ...prev,
        global: "Mapping Unique ID is missing",
      }));
      return;
    }
    const fetchData = async () => {
      const encryptedUserData = sessionStorage.getItem("user");
      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      try {
        const res = await fetch(`/api/agentorganization/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: loggedInUserId,
            requestType: "SELECTED",
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
        });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          console.error("Failed response:", res);
          throw new Error(`Failed to fetch mapping data: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.agents) {
          const agent = data.agents;
          setMapping(data);
          setAgentId(agent.agentId);
          if (agent.organizations && Array.isArray(agent.organizations)) {
            const preSelectedOrganizations = agent.organizations.map((org) => ({
              value: org.orgId,
              label: org.orgName,
            }));
            setSelectedOrganization(preSelectedOrganizations);
          } else {
            setSelectedOrganization([]);
          }
        } else {
          console.error("No agents found in the data.");
        }
      } catch (error) {
        console.error("Error during fetch:", error);
        setErrors((prev) => ({
          ...prev,
          global: "Failed to load mapping data.",
        }));
      }
    };
    fetchData();
  }, [id]);
  const handleOrganizationChange = (selected) => {
    setSelectedOrganization(selected);
  };
  if (notFound) {
    return (
      <NotFound
        message="This page does not exist."
        redirectUrl="/dashboard/agentOrganization"
        redirectText="Go Back"
      />
    );
  }
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    if (!selectedOrganization || selectedOrganization.length === 0) {
      alert(
        "No organizations selected. Please select at least one organization."
      );
      return;
    }
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
    const mappedOrgIds = Array.isArray(selectedOrganization)
      ? selectedOrganization.map((org) => ({ orgId: org.value }))
      : [{ orgId: selectedOrganization.value }];

    const formData = {
      organizationIds: mappedOrgIds,
      currentUserId,
    };
    try {
      const response = await fetch(`/api/agentorganization/update/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: currentUserId,
          requestType: "SELECTED",
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        alert(`${result.message}`);
        if (
          result.message == "Agent Organization Mapping updated successfully."
        ) {
          router.push("/dashboard/agentOrganization");
        }
      } else {
        const errorData = await response.json();
        throw new Error(`Failed to update organization: ${errorData.message}`);
      }
    } catch (error) {
      setErrors({
        global:
          error.message ||
          "An unexpected error occurred. Please try again later.",
      });
    }
  };
  if (hasAccess === null) {
    return <div>Loading...</div>;
  }
  if (hasAccess === false) {
    return null;
  }

  if (!mapping) return <p>Loading...</p>;
  const errorStyle = { color: "red", fontSize: "0.675rem" };
  return (
    <form onSubmit={handleSubmit}>
      <div className="mx-auto grid max-w-[59rem] gap-4">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 shadow-md"
            style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
            onClick={(e) => {
              e.preventDefault();
              router.push("/dashboard/agentOrganization");
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight sm:grow-0">
            Edit Agent-Organization
          </h1>
        </div>
        {errors.global && <p style={errorStyle}>{errors.global}</p>}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="agentId" className="text-xs">
                  Agent ID
                </Label>
                <Input
                  name="agentId"
                  type="text"
                  value={agentId}
                  readOnly
                  className="w-1/2 text-xs"
                  maxLength={9}
                  style={{ color: "hsl(var(--muted-foreground))" }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Organization</Label>
                <TreeDropdown
                  selected={selectedOrganization}
                  onChange={handleOrganizationChange}
                  isMulti={false}
                />
              </div>
            </div>
          </CardContent>
          <div className="flex justify-end p-6 space-x-4">
            <Button
              className="shadow-md rounded-lg px-6 py-2 text-sm font-medium transition-all"
              type="submit"
              style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
              }
            >
              Update
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
};

export default withAuth(EditAgentOrganizationPage);
