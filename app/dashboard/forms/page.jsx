"use client";

import { Suspense, useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";
import { Button } from "@/components/ui/button";
import { FaEdit, FaCopy } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import CreateFormBtn from "@/components/create-form-btn";
import withAuth from "@/components/withAuth"; // Import the withAuth HOC
import { notFound } from "next/navigation";
import Link from "next/link";

const getUserFromSession = () => {
  if (typeof window === "undefined") return null;

  const encryptedUserData = sessionStorage.getItem("user");
  if (!encryptedUserData) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};
function FormsPage({ basePath = "/dashboard/forms" }) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [privileges, setPrivileges] = useState([]);

  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);



  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);
  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        //const encryptedUserData = sessionStorage.getItem("user");
        const user = getUserFromSession();
        const userId = user?.userId ?? null;

        // ✅ Clear interactionDateRange after user validation
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        // let userId = null;

        // if (encryptedUserData) {
        //   const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        //   const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        //   const user = JSON.parse(decryptedData);
        //   userId = user?.userId || null;
        // }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 5, 
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

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  const shouldHideCreateFormButton = privileges.some(
    (privilege) => privilege.PrivilegeId === 10
  );

  return hasPrivilege(1) ? (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {shouldHideCreateFormButton && <CreateFormBtn />}
      <Suspense
        fallback={[1, 2, 3, 4].map((el) => (
          <FormCardSkeleton key={el} />
        ))}
      >
        <FormCards
          formSubmitted={formSubmitted}
          privileges={privileges}
          basePath={basePath}
        />
      </Suspense>
    </div>
  ) : (
    <div>Loading...</div>
  );
}

function FormCardSkeleton() {
  return <Skeleton className="border-2 border-primary-/20 h-[190px] w-full" />;
}

function FormCards({ formSubmitted, privileges, basePath }) {
  const [forms, setForms] = useState([]);

  const fetchForms = async () => {
    try {
      // const encryptedUserData = sessionStorage.getItem("user");
      // let userId = null;

      // if (encryptedUserData) {
      //   const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //   const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      //   const user = JSON.parse(decryptedData);
      //   userId = user?.userId || null;
      // }
      const user = getUserFromSession();
      const userId = user?.userId ?? null;
      const response = await fetch("/api/forms", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
        },
        cache: "no-store",
      });

      const data = await response.json();
      if (response.ok) {
        setForms(data.forms || []);
      } else {
        console.error("Failed to fetch forms:", `${data.message}`);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
    }
  };

  useEffect(() => {
    fetchForms(); // Initial fetch when component mounts
  }, [formSubmitted]);

  const filteredForms = forms.filter((form) => {
    const privilegeIds = privileges.map((privilege) => privilege.PrivilegeId);

    const showStatuses = new Set();

    if (privilegeIds.includes(1) && privilegeIds.includes(10)) {
      showStatuses.add(0).add(1).add(5).add(2).add(3);
    } else {
      if (privilegeIds.includes(1)) {
        showStatuses.add(5);
      }
      if (privilegeIds.includes(10)) {
        showStatuses.add(0).add(1);
      }
      if (privilegeIds.includes(7)) {
        showStatuses.add(1);
      }
      if (privilegeIds.includes(5)) {
        showStatuses.add(1);
      }
      if (privilegeIds.includes(16)) {
        showStatuses.add(5);
      }
      if (privilegeIds.includes(17)) {
        showStatuses.add(2).add(5);
      }
      if (privilegeIds.includes(18)) {
        showStatuses.add(3).add(1);
      }
    }
    return showStatuses.has(form.Status);
  });

  return (
    <>
      {filteredForms.map((form) => {
        try {
          return (
            <FormCard key={form.formId} form={form} privileges={privileges} basePath={basePath} />
          );
        } catch (error) {
          console.error("Error rendering FormCard:", error);
          return <p>Error rendering form card.</p>;
        }
      })}
    </>
  );
}

function FormCard({ form, privileges, basePath }) {
  const [basePercentage, setBasePercentage] = useState(100);
  const returnTo = encodeURIComponent(basePath);

  const calculateMaxFormScore = (sections, scoringMethod) => {
    let totalScore = 0;
    let questionMaxPosibleScore = 0;
    let length = 0;
    let sublength = 0;
    let sectionCount = 0;
    let subsectionMaxScore = 0;
    let sectionMaxScore = 0;

    try {
      sections.forEach((section) => {
        let hasSubsections = false;
        let sectionScore = 0; // Store max score per section

        section.subsections.forEach((subSection) => {
          let hasQuestions = false;
          let subMaxScore = 0; // Store max score per subsection

          subSection.questions.forEach((question) => {
            const qMaxscore = calculateQuesMaxScore(question);
            questionMaxPosibleScore += qMaxscore;
            subMaxScore += qMaxscore; // Add question score to subsection

            if (question.scorable) {
              length += 1;
            }
            hasQuestions = true;
          });

          if (hasQuestions) {
            subsectionMaxScore += subMaxScore;
            sectionScore += subMaxScore; // Add subsection score to section
            sublength += 1;
            hasSubsections = true;
          }
        });

        if (hasSubsections) {
          sectionMaxScore += sectionScore;
          sectionCount += 1;
        }
      });

      switch (scoringMethod) {
        case "Section Sum":
          totalScore = sectionMaxScore || 0;
          break;
        case "Section Average":
          totalScore = sectionMaxScore / sectionCount || 0;
          break;
        case "Section Percentage":
          if (questionMaxPosibleScore !== 0) {
            totalScore = basePercentage;
            break;
          } else totalScore = 0;
          break;
        case "Category Sum":
          totalScore = subsectionMaxScore;
          break;
        case "Category Average":
          totalScore = subsectionMaxScore / sublength || 0;
          break;
        case "Category Percentage":
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case "Question Sum":
          totalScore = questionMaxPosibleScore;
          break;
        case "Question Average":
          totalScore = questionMaxPosibleScore / length || 0;
          break;
        case "Question Percentage":
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case "None":
        default:
          totalScore = 0;
          break;
      }

      return totalScore;
    } catch (error) {
      console.error("Error calculating Max Form Score:", error);
      return 0;
    }
  };
  const calculateQuesMaxScore = (question) => {
    if (!question) {
      console.error("Error: Question is undefined.");
      return 0; // Default to 0 if question is undefined
    }

    let maxPossibleScore = 0;

    try {
      if (
        question.type === "multipleChoice" ||
        question.type === "fiveRankedList" ||
        question.type === "twoRankedList" ||
        question.type === "drpdwn"
      ) {
        // Ensure scores array is valid and not empty
        if (Array.isArray(question.scores) && question.scores.length > 0) {
          maxPossibleScore = Math.max(...question.scores.map(Number));
        }
      } else if (question.questionOptionType === "checkboxes") {
        if (Array.isArray(question.options) && Array.isArray(question.scores)) {
          question.options.forEach((option, oIndex) => {
            maxPossibleScore += Number(question.scores[oIndex] || 0);
          });
        }
      } else if (
        question.type === "shortAnswer" ||
        question.type === "paragraph"
      ) {
        // Single score value or default to 0
        maxPossibleScore = Number(question.scores?.[0] || 0);
      }
    } catch (error) {
      console.error("Error Calculating Question Max Score:", error);
    }

    return maxPossibleScore;
  };

  const handleHide = async (event) => {
    event.preventDefault();

    try {
      // const encryptedUserData = sessionStorage.getItem("user");

      // let currentUserId = null;
      // if (encryptedUserData) {
      //   try {
      //     // Decrypt the data
      //     const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //     const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      //     // Parse JSON
      //     const user = JSON.parse(decryptedData);
      //     currentUserId = user?.userId || null;
      //   } catch (error) {
      //     console.error("Error decrypting user data:", error);
      //   }
      // }
      const user = getUserFromSession();
      const currentUserId = user?.userId ?? null;
      const response = await fetch(`/api/forms/update/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          Status: 2,
          currentUserId,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Form Hide successfully!");
        window.location.reload();
      } else {
        alert(`Error Hide form: ${result.message}`);
      }
    } catch (error) {
      console.error("Error Hide form:", error);
      alert("Error Hide form:", error);
    }
  };

  const handleUnHide = async (event) => {
    event.preventDefault();

    try {
      // const encryptedUserData = sessionStorage.getItem("user");

      // let currentUserId = null;
      // if (encryptedUserData) {
      //   try {
      //     // Decrypt the data
      //     const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //     const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      //     // Parse JSON
      //     const user = JSON.parse(decryptedData);
      //     currentUserId = user?.userId || null;
      //   } catch (error) {
      //     console.error("Error decrypting user data:", error);
      //   }
      // }
      const user = getUserFromSession();
      const currentUserId = user?.userId ?? null;
      const response = await fetch(`/api/forms/update/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          Status: 5,
          currentUserId,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Form Unhide successfully!");
        window.location.reload();
      } else {
        alert(`Error Unhide form: ${result.message}`);
      }
    } catch (error) {
      console.error("Error Unhide form:", error);
      alert("Error Unhide form:", error);
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formJson = JSON.parse(form.formJson);
    const maxScore = calculateMaxFormScore(
      formJson.sections,
      formJson.scoringMethod
    );
    try {
      // const currentUserId = sessionStorage.getItem("user")
      //   ? JSON.parse(sessionStorage.getItem("user")).userId
      //   : null;

      // const encryptedUserData = sessionStorage.getItem("user");

      // let currentUserId = null;
      // if (encryptedUserData) {
      //   try {
      //     // Decrypt the data
      //     const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //     const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      //     // Parse JSON
      //     const user = JSON.parse(decryptedData);
      //     currentUserId = user?.userId || null;
      //   } catch (error) {
      //     console.error("Error decrypting user data:", error);
      //   }
      // }
      const user = getUserFromSession();
      const currentUserId = user?.userId ?? null;
      const response = await fetch(`/api/forms/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          sections: formJson.sections,
          formName: form.formName,
          formDescription: form.formDescription,
          hideFormScore: formJson.hideFormScore,
          basePercentage: formJson.basePercentage,
          baselineScore: form.baselineScore,
          scoringMethod: formJson.scoringMethod,
          visibilityRules: formJson.visibilityRules,
          scoringRules: formJson.scoringRules,
          disabledOptions: formJson.disabledOptions,
          Status: 5,
          currentUserId,
          maxScore,
          header: formJson.header,
          footer: formJson.footer,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Form published successfully!");
        window.location.reload();
      } else {
        alert(`Error saving form: ${result.message}`);
      }
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Error saving form:", error);
    }
  };

  const handleStaged = async (event) => {
    event.preventDefault();

    try {
      // const encryptedUserData = sessionStorage.getItem("user");

      // let currentUserId = null;
      // if (encryptedUserData) {
      //   try {
      //     // Decrypt the data
      //     const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //     const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      //     // Parse JSON
      //     const user = JSON.parse(decryptedData);
      //     currentUserId = user?.userId || null;
      //   } catch (error) {
      //     console.error("Error decrypting user data:", error);
      //   }
      // }
      const user = getUserFromSession();
      const currentUserId = user?.userId ?? null;
      const response = await fetch(`/api/forms/update/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          Status: 3,
          currentUserId,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("This form is now ready to be assigned to any interaction!");
        window.location.reload();
      } else {
        alert(`Error Staged form: ${result.message}`);
      }
    } catch (error) {
      console.error("Error Staged form:", error);
      alert("Error Staged form:", error);
    }
  };
  const handleUnStaged = async (event) => {
    event.preventDefault();

    try {
      // const encryptedUserData = sessionStorage.getItem("user");

      // let currentUserId = null;
      // if (encryptedUserData) {
      //   try {
      //     // Decrypt the data
      //     const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      //     const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      //     // Parse JSON
      //     const user = JSON.parse(decryptedData);
      //     currentUserId = user?.userId || null;
      //   } catch (error) {
      //     console.error("Error decrypting user data:", error);
      //   }
      // }
      const user = getUserFromSession();
      const currentUserId = user?.userId ?? null;
      const response = await fetch(`/api/forms/update/${form.formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          Status: 1,
          currentUserId,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Form Unstaged successfully!");
        window.location.reload();
      } else {
        alert(`Error Unstaged form: ${result.message}`);
      }
    } catch (error) {
      console.error("Error Unstaged form:", error);
      alert("Error Unstaged form:", error);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm("Are you sure you want to delete this form?");
    if (confirmed) {
      try {
        const res = await fetch(`/api/forms/delete/${form.formId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        });
        if (!res.ok) {
          const errorResult = await res.json();
          alert(errorResult.message || "Failed to delete form.");
          return;
        }
        alert("Form deleted successfully!");
        window.location.reload();
      } catch (error) {
        console.error(`Failed to delete form:`, error);
        alert("An unexpected error occurred. Please try again.");
      }
    }
  };
  const hasPrivilegefive = privileges.some(
    (privilege) => privilege.PrivilegeId === 5
  );
  const hasPrivilegeseven = privileges.some(
    (privilege) => privilege.PrivilegeId === 7
  );
  const hasPrivilegesixteen = privileges.some(
    (privilege) => privilege.PrivilegeId === 16
  );
  const hasPrivilegeseventeen = privileges.some(
    (privilege) => privilege.PrivilegeId === 17
  );
  const hasPrivilegeeighteen = privileges.some(
    (privilege) => privilege.PrivilegeId === 18
  );
  const hasPrivilegeninteen = privileges.some(
    (privilege) => privilege.PrivilegeId === 19
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between w-full  text-base leading-[1.3] font-sans">
          <span className="font-bold truncate">{form.formName}</span>
          {form.Status === 1 ? (
            <Badge
              variant={"outline"}
              className="bg-orange-400 text-white text-xs font-sans"
            >
              Review
            </Badge>
          ) : form.Status === 0 ? (
            <Badge
              variant={"destructive"}
              className="bg-red-500 text-white text-xs font-sans"
            >
              Draft
            </Badge>
          ) : form.Status === 5 ? (
            <Badge
              variant={"outline"}
              className="bg-green-500 text-white text-xs font-sans"
            >
              Published
            </Badge>
          ) : form.Status === 2 ? (
            <Badge
              variant={"outline"}
              className="bg-yellow-500 text-white text-xs font-sans"
            >
              Hidden
            </Badge>
          ) : form.Status === 3 ? (
            <Badge
              variant={"outline"}
              className="bg-cyan-500 text-white text-xs font-sans"
            >
              Staged
            </Badge>
          ) : null}
        </CardTitle>

        <CardDescription
          className="flex items-center justify-between text-muted-foreground text-sm"
          style={{ fontSize: "14px" }}
        >
          {formatDistance(new Date(form.Modifydate), new Date(), {
            includeSeconds: true,
            addSuffix: true,
          })}
          {hasPrivilegefive &&
            (form.Status === 0 || form.Status === 1 || form.Status === 3) && (
              <button onClick={handleDelete} title="Delete Form">
                <MdDelete className="inline-block text-xl text-[var(--brand-secondary)] hover:text-[var(--brand-primary)] transition-colors duration-200" />
              </button>
            )}
          {hasPrivilegesixteen && (form.Status === 2 || form.Status === 5) && (
            <button>
              <Link
                href={`/dashboard/forms/duplicate/${form.UniqueId}?returnTo=${returnTo}`}
                title="Copy Form"
              >
                <FaCopy className="inline-block text-xl text-[var(--brand-secondary)] hover:text-[var(--brand-primary)] transition-colors duration-200" />
              </Link>
            </button>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent
        className="h-[15px] text-sm text-muted-foreground py-1"
        style={{ fontSize: "14px" }}
      >
        <div>
          Created by:{" "}
          <span dangerouslySetInnerHTML={{ __html: form.Creationby }} />
        </div>
        {/* <div>
          Version: <span dangerouslySetInnerHTML={{ __html: form.Version }} />
        </div> */}
      </CardContent>

      <CardFooter className="flex p-1 flex-col-1 gap-1 mt-4">
        {form.Status ? (
          <>
            <Button
              asChild
              className="w-full mt-3 text-md gap-4"
              style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
            >
                <Link
                  href={`/dashboard/forms/${form.UniqueId}?returnTo=${returnTo}`}
                style={{ backgroundColor: "var(--brand-primary)" }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                }
              >
                Preview
              </Link>
            </Button>
            {hasPrivilegeseventeen && form.Status === 5 && (
              <Button
                asChild
                className="w-full mt-3 text-md gap-4"
                style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
              >
                <Link
                  onClick={handleHide}
                  href="#"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                  }
                >
                  Hide
                </Link>
              </Button>
            )}
            {hasPrivilegeseventeen && form.Status === 2 && (
              <Button
                asChild
                className="w-full mt-3 text-md gap-4"
                style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
              >
                <Link
                  onClick={handleUnHide}
                  href="#"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                  }
                >
                  Unhide
                </Link>
              </Button>
            )}
            {hasPrivilegeseven && form.Status !== 5 && form.Status !== 2 && (
              <Button
                asChild
                className="w-full mt-3 text-md gap-4"
                style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
              >
                <Link
                  onClick={handleSubmit}
                  href="#"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                  }
                >
                  Publish
                </Link>
              </Button>
            )}
            {hasPrivilegeeighteen &&
              form.Status !== 5 &&
              form.Status !== 2 &&
              form.Status !== 3 && (
                <Button
                  asChild
                  className="w-full mt-3 text-md gap-4"
                  style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
                >
                  <Link
                    onClick={handleStaged}
                    href="#"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                    }
                  >
                    Staged
                  </Link>
                </Button>
              )}
            {hasPrivilegeninteen && form.Status === 3 && (
              <Button
                asChild
                className="w-full mt-3 text-md gap-4"
                style={{ fontSize: "12px", backgroundColor: "var(--brand-primary)" }}
              >
                <Link
                  onClick={handleUnStaged}
                  href="#"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-secondary)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--brand-primary)")
                  }
                >
                  Unstaged
                </Link>
              </Button>
            )}
          </>
        ) : (
          <Button
            asChild
            variant={"secondary"}
            className="w-full mt-3 text-md gap-4"
            style={{ fontSize: "12px" }}
          >
            <Link href={`/dashboard/forms/builder/${form.UniqueId}?returnTo=${returnTo}`}>
              Edit form <FaEdit />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default withAuth(FormsPage);
