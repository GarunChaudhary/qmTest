// organizationformMapping
"use client";

import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import withAuth from "@/components/withAuth";
import { notFound } from "next/navigation";


const OrganizationFormMatching = () => {
  const [organizationList, setOrganizationList] = useState([]);
  const [formList, setFormList] = useState([]);
  const [roleList, setRoleList] = useState([]);

  const [selectedFormId, setSelectedFormId] = useState(null);
  const [formMappings, setFormMappings] = useState({}); // { formId: { orgIds: [], roleIds: [] } }

  const [userId, setUserId] = useState(null);
  

  // useEffect(() => {
  //   const encrypted = sessionStorage.getItem("user");
  //   sessionStorage.removeItem("interactionDateRange");
  //   sessionStorage.removeItem("selectedCallStatus");
  //   if (encrypted) {
  //     const user = JSON.parse(
  //       CryptoJS.AES.decrypt(encrypted, "").toString(CryptoJS.enc.Utf8)
  //     );
  //     const uid = user?.userId || null;
  //     setUserId(uid);
  //   }

  //   fetch("/api/organizationformmapping", {
  //     headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` }
  //   })
  //     .then((r) => r.json())
  //     .then((d) => {
  //       setOrganizationList(d.organizations || []);
  //       setFormList(d.forms || []);
  //     });

  //   fetch("/api/organizationformmapping/getroles", {
  //     headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` }
  //   })
  //     .then((r) => r.json())
  //     .then((d) => setRoleList(d.roles || []));
  // }, []);



  const [privileges, setPrivileges] = useState([]);
    const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  
  
    const hasPrivilege = (privId) =>
      privileges.some((p) => p.PrivilegeId === privId);
  
    useEffect(() => {
      const fetchPrivileges = async () => {
        try {
          const encryptedUserData = sessionStorage.getItem("user");
          // ✅ Clear interactionDateRange after user validation
          sessionStorage.removeItem("interactionDateRange");
          sessionStorage.removeItem("selectedCallStatus");
          let userId = null;
  
          if (encryptedUserData) {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const user = JSON.parse(decryptedData);
            userId = user?.userId || null;
          }
  
          const response = await fetch(`/api/privileges`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
              loggedInUserId: userId,
              moduleId: 9, 
              orgId: sessionStorage.getItem("selectedOrgId") || "", // Users module
            },
          });
  
          if (!response.ok) throw new Error("Failed to fetch privileges");
          const data = await response.json();
  
          setPrivileges(data.privileges || []);
          setPrivilegesLoaded(true);
  
        } catch (err) {
          console.error("Error fetching privileges:", err);
          setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
        }
      };
  
      fetchPrivileges();
    }, []);
    useEffect(() => {
      if (privilegesLoaded && hasPrivilege(1)) {
       initializeData();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [privilegesLoaded]);
  
    if (!privilegesLoaded) {
      return <p className="text-xs text-muted-foreground">Loading...</p>;
    }
  
    if (privilegesLoaded && !hasPrivilege(1)) {
      return notFound(); // Renders Next.js 404 page
    }

    const initializeData = async () => {
    const encrypted = sessionStorage.getItem("user");
    sessionStorage.removeItem("interactionDateRange");
    sessionStorage.removeItem("selectedCallStatus");

    if (encrypted) {
      const user = JSON.parse(
        CryptoJS.AES.decrypt(encrypted, "").toString(CryptoJS.enc.Utf8)
      );
      const uid = user?.userId || null;
      setUserId(uid);
    }

    try {
      const orgRes = await fetch("/api/organizationformmapping", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
      });
      const orgData = await orgRes.json();
      setOrganizationList(orgData.organizations || []);
      setFormList(orgData.forms || []);

      const roleRes = await fetch("/api/organizationformmapping/getroles", {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
      });
      const roleData = await roleRes.json();
      setRoleList(roleData.roles || []);
    } catch (err) {
      console.error("Error initializing data:", err);
    }
  };

 

  const handleFormClick = async (formId) => {
    setSelectedFormId(formId);

    // If we already have it in state, use it
    if (formMappings[formId]) return;

    // Otherwise fetch from backend
    const res = await fetch("/api/organizationformmapping/getexistingform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`
      },
      body: JSON.stringify({ formId })
    });

    const data = await res.json();
    const mappings = data?.mappings || [];

    // Extract orgIds and roleIds from the mapping
    const orgIds = [...new Set(mappings.map((m) => m.OrganizationId))];
    const roleIds = [...new Set(mappings.map((m) => m.RoleId))];

    setFormMappings((prev) => ({
      ...prev,
      [formId]: {
        orgIds,
        roleIds
      }
    }));
  };

  const handleOrgToggle = (orgId) => {
    setFormMappings((prev) => {
      const current = prev[selectedFormId] || { orgIds: [], roleIds: [] };
      const orgIds = current.orgIds.includes(orgId)
        ? current.orgIds.filter((id) => id !== orgId)
        : [...current.orgIds, orgId];
      return {
        ...prev,
        [selectedFormId]: { ...current, orgIds }
      };
    });
  };

  const handleRoleToggle = (roleId) => {
    setFormMappings((prev) => {
      const current = prev[selectedFormId] || { orgIds: [], roleIds: [] };
      const roleIds = current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId];
      return {
        ...prev,
        [selectedFormId]: { ...current, roleIds }
      };
    });
  };


  const handleSaveMapping = async () => {
    if (!Object.keys(formMappings).length) {
      alert("No form mappings to process.");
      return;
    }

    const toSave = [];
    const toDelete = [];
    const invalidForms = [];

    for (const [formId, currentMapping] of Object.entries(formMappings)) {
      const hasOrgs = currentMapping.orgIds.length > 0;
      const hasRoles = currentMapping.roleIds.length > 0;

      // Always fetch previous mappings — even if both are empty
      const resExisting = await fetch("/api/organizationformmapping/getexistingform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`
        },
        body: JSON.stringify({ formId: parseInt(formId) })
      });

      const dataExisting = await resExisting.json();
      const prevMappings = dataExisting?.mappings || [];

      const newMappings = [];

      // Case 1: Both orgs and roles selected => create new mappings
      if (hasOrgs && hasRoles) {
        currentMapping.orgIds.forEach((orgId) => {
          currentMapping.roleIds.forEach((roleId) => {
            newMappings.push({
              organizationId: orgId,
              roleId: roleId,
              formId: parseInt(formId)
            });
          });
        });
      }

      // Case 2: Only one selected — mark form invalid
      if ((hasOrgs && !hasRoles) || (!hasOrgs && hasRoles)) {
        invalidForms.push(formId);
        continue;
      }

      // Compare new with previous
      const prevKeys = prevMappings.map(
        (m) => `${m.OrganizationId}_${m.RoleId}_${m.FormId}`
      );
      const newKeys = newMappings.map(
        (m) => `${m.organizationId}_${m.roleId}_${m.formId}`
      );

      // Find toSave
      newMappings.forEach((m) => {
        const key = `${m.organizationId}_${m.roleId}_${m.formId}`;
        if (!prevKeys.includes(key)) {
          toSave.push(m);
        }
      });

      // Find toDelete — this works even if newMappings is empty
      prevMappings.forEach((m) => {
        const key = `${m.OrganizationId}_${m.RoleId}_${m.FormId}`;
        if (!newKeys.includes(key)) {
          toDelete.push({
            organizationId: m.OrganizationId,
            roleId: m.RoleId,
            formId: m.FormId
          });
        }
      });
    }

    // Invalid form selections
    if (invalidForms.length) {
      const formNames = invalidForms
        .map((fid) => {
          const f = formList.find((f) => f.Form_id === parseInt(fid));
          return f ? f.form_name : `Form ID ${fid}`;
        })
        .join(", ");
      alert(`Please select both Organization and Role for the following form(s):\n${formNames}`);
      return;
    }

    if (!toSave.length && !toDelete.length) {
      return alert("No changes to save.");
    }

    const payload = { userId };
    if (toSave.length) payload.toSave = toSave;
    if (toDelete.length) payload.toDelete = toDelete;

    const res = await fetch("/api/organizationformmapping/saveroleorgform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      return alert("Save failed: " + (data.message || res.statusText));
    }

    alert(data.message);
    window.location.reload();
  };


  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-card p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Select a Form</h2>
          <div className="max-h-48 overflow-auto pr-1"> {/* 👈 Scroll wrapper */}
            <ul className="grid grid-cols-2 gap-2">
              {formList.map((form) => (
                <li
                  key={form.Form_id}
                  onClick={() => handleFormClick(form.Form_id)}
                  className={`cursor-pointer border p-2 rounded ${selectedFormId === form.Form_id ? "bg-blue-100" : "hover:bg-muted"
                    }`}
                >
                  {form.form_name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Organization and Role Mapping */}
        {selectedFormId && (
          <div className="bg-card p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Assign to Organizations and Roles</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Organizations */}

              <div>
                <h4 className="font-semibold mb-2">Organizations</h4>
                <div className="h-64 overflow-auto border rounded p-2">
                  {/* Select/Deselect All */}
                  <label className="block space-x-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        organizationList.length > 0 &&
                        organizationList.every((org) =>
                          formMappings[selectedFormId]?.orgIds.includes(org.id)
                        )
                      }
                      onChange={() => {
                        const allOrgIds = organizationList.map((org) => org.id);
                        const current = formMappings[selectedFormId] || { orgIds: [], roleIds: [] };
                        const isAllSelected = allOrgIds.every((id) =>
                          current.orgIds.includes(id)
                        );

                        setFormMappings((prev) => ({
                          ...prev,
                          [selectedFormId]: {
                            ...current,
                            orgIds: isAllSelected ? [] : allOrgIds,
                          },
                        }));
                      }}
                    />
                    <span>
                      {organizationList.every((org) =>
                        formMappings[selectedFormId]?.orgIds.includes(org.id)
                      )
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </label>

                  {/* Individual Orgs */}
                  {organizationList.map((org) => (
                    <label key={org.id} className="block space-x-2">
                      <input
                        type="checkbox"
                        checked={formMappings[selectedFormId]?.orgIds.includes(org.id) || false}
                        onChange={() => handleOrgToggle(org.id)}
                      />
                      <span>{org.org_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Roles */}

              <div>
                <h4 className="font-semibold mb-2">Roles</h4>
                <div className="h-64 overflow-auto border rounded p-2">
                  {/* Select/Deselect All */}
                  <label className="block space-x-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        roleList.length > 0 &&
                        roleList.every((role) =>
                          formMappings[selectedFormId]?.roleIds.includes(role.user_role_id)
                        )
                      }
                      onChange={() => {
                        const allRoleIds = roleList.map((role) => role.user_role_id);
                        const current = formMappings[selectedFormId] || { orgIds: [], roleIds: [] };
                        const isAllSelected = allRoleIds.every((id) =>
                          current.roleIds.includes(id)
                        );

                        setFormMappings((prev) => ({
                          ...prev,
                          [selectedFormId]: {
                            ...current,
                            roleIds: isAllSelected ? [] : allRoleIds,
                          },
                        }));
                      }}
                    />
                    <span>
                      {roleList.every((role) =>
                        formMappings[selectedFormId]?.roleIds.includes(role.user_role_id)
                      )
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </label>

                  {/* Individual Roles */}
                  {roleList.map((role) => (
                    <label key={role.user_role_id} className="block space-x-2">
                      <input
                        type="checkbox"
                        checked={
                          formMappings[selectedFormId]?.roleIds.includes(role.user_role_id) ||
                          false
                        }
                        onChange={() => handleRoleToggle(role.user_role_id)}
                      />
                      <span>{role.user_role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveMapping}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-primary"
            >
              Save Mapping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(OrganizationFormMatching);


