"use client";
import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import * as XLSX from "xlsx"; // Excel library
import TreeDropdown from "@/components/organizationTreeDDL";
const AddAgentOrganizationPage = () => {
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [selectedOrganization, setSelectedOrganization] = useState([]);
  const [agentIds, setAgentIds] = useState([]);
  const [singleAgentId, setSingleAgentId] = useState("");
  const [file, setFile] = useState(null);
  const [uploadMode, setUploadMode] = useState("single");
  const [hasAccess, setHasAccess] = useState(null);

  const downloadDummyExcel = () => {
    const worksheetData = [["Agent ID"], ["123456789"]];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DummyData");
    XLSX.writeFile(workbook, "dummy-agent-organization.xlsx");
  };

  const handleOrganizationChange = (selected) => {
    setSelectedOrganization(selected);
  };
  useEffect(() => {
    const fetchPrivilege = async () => {
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
            (privilege) => privilege.PrivilegeId === 2
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

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) {
      return;
    }
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const headerRow = rows[0];
      const agentIdColumnIndex = headerRow.indexOf("Agent ID");
      if (headerRow.length !== 1 || agentIdColumnIndex === -1) {
        alert("The Excel file must only contain 'Agent ID'.");
        e.target.value = "";
        setFile(null);
        return;
      }
      const extractedAgentIds = rows.slice(1).map((row) => {
        const agentId = row[agentIdColumnIndex];
        return { agentId };
      });
      const hasEmptyAgentIds = extractedAgentIds.some(
        (idObj) => !idObj.agentId || idObj.agentId === ""
      );
      if (hasEmptyAgentIds) {
        alert("Some Agent IDs are missing in the Excel file.");
        e.target.value = "";
        setFile(null);
        return;
      }
      const hasInvalidLength = extractedAgentIds.some(
        (idObj) => idObj.agentId.toString().length !== 9
      );
      if (hasInvalidLength) {
        alert("Agent ID must be exactly 9 digits long.");
        e.target.value = "";
        setFile(null);
        return;
      }
      if (extractedAgentIds.some((idObj) => isNaN(idObj.agentId))) {
        alert("Invalid agent ID found in the Excel file.");
        e.target.value = "";
        setFile(null);
        return;
      }
      setAgentIds((prevAgentIds) => [...prevAgentIds, ...extractedAgentIds]);
    };
    reader.readAsArrayBuffer(uploadedFile);
  };
  const handleResetFile = () => {
    setFile(null);
    setAgentIds([]);
    setErrors({});
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.value = "";
    }
  };
  const handleSingleAgentIdAdd = async () => {
    if (!singleAgentId) {
      alert("Agent ID is required.");
      return;
    }
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
    const payload = {
      // organizationId: selectedOrganization.map((org) => ({
      //   orgId: org.value,
      // })),
      organizationId: (Array.isArray(selectedOrganization)
        ? selectedOrganization
        : [selectedOrganization]
      ).map((org) => ({
        orgId: org?.value,
      })),

      agentId: parseInt(singleAgentId, 10),
      currentUserId: loggedInUserId,
    };
    try {
      const response = await fetch("/api/agentorganization/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) {
        alert(`${result.message}`);
        if (result.message == "New mappings inserted successfully.") {
          router.push("/dashboard/agentOrganization");
        }
      } else {
        alert(
          result.message ||
          "An unexpected error occurred. Please try again later."
        );
        return false;
      }
    } catch (error) {
      console.error(`Error while adding Agent ID: ${error.message || error}`);
      alert(
        error.message || "An unexpected error occurred. Please try again later."
      );
      return false;
    }
  };
  const handleSave = async (event) => {
    event.preventDefault();
    if (uploadMode === "single") {
      const isSingleAgentIdAdded = await handleSingleAgentIdAdd();
      if (!isSingleAgentIdAdded) {
        return;
      }
      alert("Agent-Organization created successfully!");
      router.push("/dashboard/agentOrganization");
    }
    if (uploadMode === "bulk") {
      if (agentIds.length === 0) {
        alert("Agent ID is required.");
        return;
      }
      if (!selectedOrganization || selectedOrganization.length === 0) {
        alert(
          "No organizations selected. Please select at least one organization."
        );
        return;
      }
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
      const payload = {
        // organizationId: selectedOrganization.map((org) => ({
        //   orgId: org.value,
        // })),
        organizationId: (Array.isArray(selectedOrganization)
          ? selectedOrganization
          : [selectedOrganization]
        ).map((org) => ({
          orgId: org?.value,
        })),
        agentIds: agentIds.map((idObj) => idObj.agentId),
        currentUserId: loggedInUserId,
      };
      try {
      const response = await fetch("/api/agentorganization/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
        const result = await response.json();
        if (response.ok) {
          alert(`${result.message}`);
          if (
            result.message ==
            "Bulk mapping for multiple organizations completed successfully."
          ) {
            router.push("/dashboard/agentOrganization");
            return true;
          }
        } else {
          alert(
            result.message ||
            "An unexpected error occurred. Please try again later."
          );
          return false;
        }
      } catch (error) {
        console.error(`Error while adding Agent ID: ${error.message || error}`);
        alert(
          error.message ||
          "An unexpected error occurred. Please try again later."
        );
        return false;
      }
    }
  };
  const handleModeChange = (mode) => {
    setUploadMode(mode);
    setErrors({});
    setSelectedOrganization(null);
    if (mode === "single") {
      setFile(null);
      setAgentIds([]);
    } else if (mode === "bulk") {
      setSingleAgentId("");
    }
  };
  if (hasAccess === null) {
    return <div>Loading...</div>;
  }
  if (hasAccess === false) {
    return null;
  }
  const errorStyle = { color: "red", fontSize: "0.675rem" };
  return (
    <form>
      <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Back button */}
          <Link href="/dashboard/agentOrganization" passHref>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shadow-md"
              style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap">
            Add Agent-Organization
          </h1>
          <div className="items-center gap-2 md:ml-auto md:flex">
            <Button
              size="sm"
              className="shadow-md"
              type="submit"
              onClick={handleSave}
              style={{ backgroundColor: "var(--brand-primary)", color: "#ffffff" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
              }
            >
              Save
            </Button>
          </div>
        </div>
        {errors.global && <p style={errorStyle}>{errors.global}</p>}
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-1">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label className="text-xs">Select Mode</Label>
                <div className="flex gap-6">
                  <label
                    htmlFor="single"
                    className="flex items-center text-xs gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      id="single"
                      name="uploadMode"
                      value="single"
                      checked={uploadMode === "single"}
                      onChange={() => handleModeChange("single")}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    Single Agent ID
                  </label>

                  <label
                    htmlFor="bulk"
                    className="flex items-center text-xs gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      id="bulk"
                      name="uploadMode"
                      value="bulk"
                      checked={uploadMode === "bulk"}
                      onChange={() => handleModeChange("bulk")}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    Bulk Excel Upload
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-1">
          {uploadMode === "single" ? (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Agent ID</Label>
                    <Input
                      className="text-xs"
                      placeholder="Enter Agent ID"
                      value={singleAgentId}
                      maxLength={9}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setSingleAgentId(value);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Bulk Upload</Label>
                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center ">
                      <Input
                        id="fileInput"
                        className="w-full md:w-1/2 lg:w-1/4 border-2 border-black"
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          downloadDummyExcel();
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#20c997")
                        }
                        className="bg-[#20c997]  text-white text-xs px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                      >
                        Download Format
                      </button>
                      {file && (
                        <Button
                          variant="destructive"
                          onClick={handleResetFile}
                          className="text-white text-xs px-4 py-0 rounded-lg hover:bg-[var(--brand-secondary)] transition-all"
                        >
                          Remove File
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Organization</Label>
                  <TreeDropdown
                    value={selectedOrganization}
                    onChange={handleOrganizationChange}
                    isMulti={false}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};
export default withAuth(AddAgentOrganizationPage);
