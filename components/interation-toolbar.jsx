"use client";
import { useState, useEffect } from "react";
import DynamicForm from "@/components/dynamicForm";
import { Button } from "@/components/ui/button";
import "./Styles/Sidebar.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SubmittedForm from "./show-SubmittedForm";
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { useRef } from "react";
import { AudioPlayer } from "@/components/audio-player";
const IterationToolbar = ({
  formData,
  formId,
  UserId,
  Status,
  audioUrl,
  fileExtension,
  audioError,
  grantedPrivileges,
  onBack,
  downloadNode,
}) => {
  const [assignedForms, setAssignedForms] = useState([]);
  const [submittedForms, setsubmittedForms] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiteedOpen, setIsSubmiteedOpen] = useState(false);
  const [isFormFullscreen, setIsFormFullscreen] = useState(false);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [formType, setFormType] = useState(null);
  const formRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    if (
      formRef.current &&
      selectedForm &&
      form &&
      !hasAutoScrolledRef.current
    ) {
      setTimeout(() => {
        if (!isFormFullscreen) {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          hasAutoScrolledRef.current = true; // 🔒 lock it
        }
      }, 300);
    }
  }, [selectedForm, formType, isFormFullscreen]);

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    if (isOpen) {
      fetchAssignedForms();
    } else if (isSubmiteedOpen) {
      fetchSubmittedForms();
    }
    fetchPrivilege();
  }, [isOpen, isSubmiteedOpen]);

  useEffect(() => {
    if (formId) {
      // Fetch the submitted form list first to find the UniqueId
      const fetchAndOpenForm = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/interactions/submittedform/${formId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
                loggedInUserId: UserId,
                interactionId: formData.id,
              },
            },
          );

          const data = await response.json();
          if (response.ok) {
            // Access the first form from the data array
            const formData = data.data[0]; // Change from data.forms[0] to data.data[0]
            if (formData) {
              setForm({
                ...formData,
                ansFormJson: formData.ansFormJson, // No need to parse, just assign the object
              });
            }
            setSelectedForm(formData);
            setFormType("submitted");
          } else {
            console.error("Error fetching form:", `${data.message}`);
          }
        } catch (error) {
          console.error("Error fetching form:", error);
        } finally {
          setLoading(false);
          //router.push("?page=SubmittedForm"); // Navigate to evaluate page
        }
      };

      fetchAndOpenForm();
    }
  }, [formId, formData.id]); // runs when formId is passed

  const fetchFormById = async (UniqueId, assignedFormId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/${UniqueId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const formData = data.forms[0];
        if (formData) {
          const parsedFormJson = JSON.parse(formData.formJson);

          const currentTimestamp = new Date();
          setForm({
            ...formData,
            formJson: parsedFormJson,
            assignedFormId,
            timestamp: currentTimestamp,
          });
          setSelectedForm(formData);
          setFormType("evaluation");
        }
      } else {
        console.error("Error fetching form:", data.message);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleCloseForm = () => {
    setSelectedForm(null);
    setForm(null);
    setFormType(null);
    setIsFormFullscreen(false);
    hasAutoScrolledRef.current = false; // 🔓 allow next open
  };

  const viewSubmission = async (UniqueId) => {
    setLoading(true);
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      if (!loggedInUserId) {
        console.error("User not logged in.");
        return;
      }

      const response = await fetch(
        `/api/interactions/submittedform/${UniqueId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: loggedInUserId,
            interactionId: formData.id,
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        // Access the first form from the data array
        const formData = data.data[0]; // Change from data.forms[0] to data.data[0]

        if (formData) {
          setForm({
            ...formData,
            ansFormJson: formData.ansFormJson, // No need to parse, just assign the object
          });
        }
        setSelectedForm(formData);
        setFormType("submitted");
      } else {
        console.error("Error fetching form:", `${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching form:", error);
    } finally {
      setLoading(false);
      //router.push("?page=SubmittedForm"); // Navigate to evaluate page
    }
  };

  const fetchAssignedForms = async () => {
    setLoading(true);
    try {
      let loggedInUserId = null;
      //if (Status !== "1") {
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: loggedInUserId,
      };

      // Fetch the form data
      const res = await fetch(`/api/interactions/mappedform/${formData.id}`, {
        method: "GET",
        headers: headers,
      });

      // Check if the response is not OK before parsing JSON
      if (!res.ok) {
        // Log the status code for better debugging
        setFetchError("No assigned forms available for this interaction.");
        setAssignedForms([]);
        return;
      }

      // Parse the JSON response if the status code is OK
      const result = await res.json();

      // Check the message for no assigned forms
      if (result.message === "Record Not Found.") {
        setFetchError("No assigned forms available for this interaction.");
        setAssignedForms([]);
        return;
      }

      // Set the assigned forms if the request was successful
      setAssignedForms(result.mappedForm);
    } catch (error) {
      // Log the error
      console.error("Failed to fetch assigned forms:", error);
      setFetchError("An error occurred while fetching assigned forms.");
    } finally {
      setLoading(false);
    }
  };
  const fetchSubmittedForms = async () => {
    setLoading(true);
    try {
      let loggedInUserId = null;
      if (Status !== "1") {
        const encryptedUserData = sessionStorage.getItem("user");
        if (encryptedUserData) {
          try {
            // Decrypt the data
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

            // Parse JSON
            const user = JSON.parse(decryptedData);
            loggedInUserId = user?.userId || null;
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }
      } else {
        loggedInUserId = UserId;
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: loggedInUserId,
      };

      // Fetch the form data
      const res = await fetch(
        `/api/interactions/submittedformddl/${formData.id}`,
        {
          method: "GET",
          headers: headers,
        },
      );

      if (!res.ok) {
        setFetchError("No assigned forms available for this interaction.");
        setsubmittedForms([]);
        return;
      }

      // Parse the JSON response if the status code is OK
      const result = await res.json();
      // Check the message for no assigned forms
      if (result.message === "Record Not Found.") {
        setFetchError("No assigned forms available for this interaction.");
        setsubmittedForms([]);
        return;
      }

      // Set the assigned forms if the request was successful
      setsubmittedForms(result.mappedForm);
    } catch (error) {
      // Log the error
      console.error("Failed to fetch assigned forms:", error);
      setFetchError("An error occurred while fetching assigned forms.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivilege = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
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
          moduleId: 6, // Users module
          orgId: sessionStorage.getItem("selectedOrgId") || "",
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

  if (!formData) {
    return <div className="text-xs">Loading...</div>;
  }

  const hasPrivilegeEight = privileges.some(
    (privilege) => privilege.PrivilegeId === 8,
  );
  const hasPrivilegeNine = privileges.some(
    (privilege) => privilege.PrivilegeId === 9,
  );

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  const FormButtons = () => (
    <>
      {hasPrivilegeEight && (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-9 px-5 gap-2 shadow-md rounded-lg font-semibold transition-all duration-200"
              onClick={() => { setLoading(true); fetchAssignedForms().finally(() => setLoading(false)); }}
            >
              <FileText className="w-4 h-4" /> Evaluation Forms
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2 shadow-lg border rounded-lg bg-card flex flex-col">
            <div className="flex-grow overflow-y-auto max-h-60 scrollable-content">
              {loading ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-center py-2 text-xs">Loading...</DropdownMenuItem>
              ) : Array.isArray(assignedForms) && assignedForms.length > 0 ? (
                assignedForms.map((f) => (
                  <DropdownMenuItem
                    key={f.formId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-100 transition-all duration-200 cursor-pointer ${selectedForm?.formId === f.formId ? "bg-blue-200" : ""}`}
                    onClick={() => fetchFormById(f.UniqueId, f.id)}
                  >{f.formName}</DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled className="text-muted-foreground text-center py-2">No forms available</DropdownMenuItem>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {hasPrivilegeNine && (
        <DropdownMenu open={isSubmiteedOpen} onOpenChange={setIsSubmiteedOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-9 px-5 gap-2 shadow-md rounded-lg font-semibold transition-all duration-200"
              onClick={() => { setLoading(true); fetchSubmittedForms().finally(() => setLoading(false)); }}
            >
              <FileText className="w-4 h-4" /> Submitted Forms
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2 shadow-lg border rounded-lg bg-card flex flex-col">
            <div className="flex-grow overflow-y-auto max-h-60 scrollable-content">
              {loading ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-center py-2 text-xs">Loading...</DropdownMenuItem>
              ) : submittedForms.length > 0 ? (
                submittedForms.map((f) => (
                  <DropdownMenuItem
                    key={f.formId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-100 transition-all duration-200 cursor-pointer ${selectedForm?.formId === f.formId ? "bg-blue-200" : ""}`}
                    onClick={() => viewSubmission(f.UniqueId)}
                  >{f.formName}</DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled className="text-muted-foreground text-center py-2">No forms available</DropdownMenuItem>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );

  const FormToolbar = () => (
    <div className="sticky flex justify-end gap-2">
      <button onClick={() => setIsFormFullscreen(!isFormFullscreen)} className="px-2 py-1 text-sm border rounded hover:bg-muted shadow-sm" title="Toggle fullscreen">
        {isFormFullscreen ? "-" : "⛶"}
      </button>
      <button onClick={handleCloseForm} className="px-2 py-1 text-sm border rounded hover:bg-red-100 text-destructive shadow-sm" title="Close form">✕</button>
    </div>
  );

  return (
    <div>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-4">
        {onBack && (
          <Button variant="outline" size="icon" className="h-7 w-7 shadow-md" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <span className="sr-only">Back</span>
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <FormButtons />
          {downloadNode}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className={`${selectedForm ? "flex items-stretch" : "block"}`}>
        <div className={`${selectedForm ? isFormFullscreen ? "hidden" : "w-1/2 border-r" : "w-full"}`}>
          {hasPrivilege(1) ? (
            <AudioPlayer
              AURL={audioUrl}
              audioError={audioError}
              fileExtension={fileExtension}
              filePath={formData.fileLocation || formData.file_location}
              fileSourceType={formData.fileSourceType || formData.file_source_type}
              transcriptionFilePath={formData.transcriptionfilepath || formData.transcription_file_path || null}
              transcriptionSourceType={formData.transcription_source_type || null}
              interactionId={formData.id}
              callData={formData}
              grantedPrivileges={grantedPrivileges}
            />
          ) : (
            <p className="text-xs text-muted-foreground p-4">Loading audio components...</p>
          )}
        </div>

        {selectedForm && (
          <div className={`transition-all border rounded duration-300 h-full ${isFormFullscreen ? "w-full" : "w-1/2"}`}>
            {formType === "evaluation" && form && (
              <>
                <FormToolbar />
                <DynamicForm
                  UniqueId={form.UniqueId}
                  formId={form.formId}
                  interactionId={formData.id}
                  status={form.Status}
                  sections={form.formJson.sections}
                  formName={form.formName}
                  formDescription={form.formDescription}
                  sectionDetails={form.formJson.sections.map((s) => s.sectionDetails)}
                  sectionDescription={form.formJson.sections.map((s) => s.sectionDescription)}
                  visibilityRules={form.formJson.visibilityRules}
                  scoringRules={form.formJson.scoringRules}
                  scoringMethod={form.formJson.scoringMethod}
                  QuestionInstructions={false}
                  hideFormScore={form.formJson.hideFormScore}
                  basePercentage={form.formJson.basePercentage}
                  baselineScore={form.baselineScore}
                  timestamp={form.timestamp}
                  header={form.formJson.header}
                  footer={form.formJson.footer}
                />
              </>
            )}
            {formType === "submitted" && form && (
              <>
                <FormToolbar />
                <SubmittedForm
                  UniqueId={form.UniqueId}
                  formId={form.formId}
                  interactionId={formData.id}
                  sections={form.ansFormJson.sections}
                  formName={form.formName}
                  formDescription={form.formDescription}
                  sectionDetails={form.ansFormJson.sections.map((s) => s.sectionDetails)}
                  sectionDescription={form.ansFormJson.sections.map((s) => s.sectionDescription)}
                  visibilityRules={form.ansFormJson.visibilityRules}
                  scoringRules={form.ansFormJson.scoringRules}
                  scoringMethod={form.ansFormJson.scoringMethod}
                  QuestionInstructions={false}
                  hideFormScore={form.ansFormJson.hideFormScore}
                  basePercentage={form.ansFormJson.basePercentage}
                  baselineScore={form.baselineScore}
                  totalformScore={form.ansFormJson.totalScore}
                  timestamp={form.timestamp}
                  header={form.ansFormJson.header}
                  footer={form.ansFormJson.footer}
                  evaluator={form.user_full_name}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(IterationToolbar);
