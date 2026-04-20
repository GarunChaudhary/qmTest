//components/forgot-password-form.jsx
"use client";
import { z } from "zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";

const FormSchema = z.object({
  loginId: z.string().optional(),
  email: z.string().optional(),
});

export default function ForgotPasswordForm({ onSuccess, className = "" }) {
  const [mode, setMode] = React.useState("byEmail");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingEmail, setIsFetchingEmail] = React.useState(false);

  const [loginId, setLoginId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [emailFromBackend, setEmailFromBackend] = React.useState(null);
  const [hasFetchedEmail, setHasFetchedEmail] = React.useState(false);
  const [showEmailWarning, setShowEmailWarning] = React.useState(false);
  const {
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(FormSchema),
  });

  React.useEffect(() => {
    // Reset fields when mode changes
    setLoginId("");
    setEmail("");
    setEmailFromBackend(null);
    setHasFetchedEmail(false);
    clearErrors();
    setShowEmailWarning(false);
  }, [mode, clearErrors]);

  const onSubmit = async () => {
    setIsLoading(true);
    clearErrors();

    try {
      if (mode === "byLoginId") {
        if (loginId.length < 5) {
          setError("generic", {
            message: "Login ID must be at least 5 characters long.",
          });
          setIsLoading(false);
          return;
        }

        if (loginId.length > 50) {
          setError("generic", {
            message: "Login ID must be at most 50 characters long.",
          });
          setIsLoading(false);
          return;
        }

        // FIRST click: fetch email
        if (!hasFetchedEmail) {
          setIsFetchingEmail(true);

          const res = await fetch("/api/getEmailByLoginId", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loginId }),
          });

          const result = await res.json();
          setIsFetchingEmail(false);

          if (result.success && result.email) {
            setEmail(result.email);
            setEmailFromBackend(result.email);
            setHasFetchedEmail(true);
            setShowEmailWarning(false); // ✅ hide warning if valid email found

            // ✅ Auto-send OTP now
            const otpRes = await fetch(
              "/api/generateForgotPasswordOtpByLoginId",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId, email: result.email }),
              }
            );

            const otpResult = await otpRes.json();

            if (otpRes.ok && otpResult.success) {
              alert("OTP sent to your registered email.");
              if (onSuccess) onSuccess(result.email);
            } else {
              setError("generic", {
                message: otpResult.message || "Failed to send OTP.",
              });
            }

            setIsLoading(false);
            return;
          } else if (result.success && !result.email) {
            // ⚠️ Login ID exists but has no email — show input and message
            setEmail("");
            setEmailFromBackend(null);
            setHasFetchedEmail(true);
            setShowEmailWarning(true);
            setIsLoading(false);
            return; // ✅ Stop here. Wait for user to type email and click again
          } else {
            // ❌ Login ID does not exist
            setError("generic", {
              message: "Login ID not found.",
            });
            setIsLoading(false);
            return;
          }
        }

        // SECOND click: user entered a new email manually
        if (!email) {
          setError("generic", {
            message: "Please enter your email to receive OTP.",
          });
          setIsLoading(false);
          return;
        }

        // Send OTP to newly entered email
        const otpRes = await fetch("/api/generateForgotPasswordOtpByLoginId", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId, email }),
        });

        const otpResult = await otpRes.json();

        if (otpRes.ok && otpResult.success) {
          alert("OTP sent to your email.");
          if (onSuccess) onSuccess(email);
        } else {
          setError("generic", {
            message: otpResult.message || "Failed to send OTP.",
          });
        }

        setIsLoading(false);
        return;
      }

      // Email mode
      const response = await fetch("/api/generateForgotPasswordOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: email }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("OTP sent to your email.");
        if (onSuccess) onSuccess(email);
      } else {
        setError("generic", {
          message: result.message || "Failed to send OTP.",
        });
      }
    } catch (err) {
      console.error(err);
      setError("generic", { message: "Unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }}
        className="grid gap-4"
      >
        {mode === "byEmail" && (
          <div className="grid gap-2">
            <Input
              id="email"
              placeholder="Enter Email"
              type="email"
              disabled={isLoading}
              maxLength={50}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {mode === "byLoginId" && (
          <>
            <div className="grid gap-2">
              <Input
                id="loginId"
                placeholder="Enter Login ID"
                type="text"
                disabled={isLoading || isFetchingEmail}
                maxLength={50}
                value={loginId}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                  setLoginId(value);
                  setEmail("");
                  setEmailFromBackend(null);
                  setHasFetchedEmail(false);
                  clearErrors();
                }}
              />
            </div>

            {isFetchingEmail && (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                Fetching email...
              </div>
            )}

            {hasFetchedEmail && (
              <div className="grid gap-2 mt-2">
                <Input
                  id="email"
                  placeholder="Enter Email"
                  type="email"
                  disabled={!!emailFromBackend || isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.trim() !== "")
                      setShowEmailWarning(false); // ✅ hide yellow warning when typing
                  }}
                />

                {showEmailWarning && !emailFromBackend && (
                  <p className="text-xs text-yellow-600 mt-1">
                    This user does not have an email. Please enter your email.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {errors.generic && (
          <p className="text-center text-destructive text-xs">
            {errors.generic.message}
          </p>
        )}

        <Button
          disabled={isLoading || isSubmitting || isFetchingEmail}
          type="submit"
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Send OTP
        </Button>

        <div className="text-center text-sm mt-2">
          {mode === "byEmail" ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMode("byLoginId");
              }}
              className="text-primary hover:underline"
            >
              Reset by Login ID
            </a>
          ) : (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMode("byEmail");
              }}
              className="text-primary hover:underline"
            >
              Reset by Email
            </a>
          )}
        </div>

        <div className="text-center text-sm mt-2">
          <a href="/" className="text-muted-foreground hover:underline">
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
}

