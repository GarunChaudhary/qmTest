//components/verify-otp-form.jsx

"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export default function VerifyOtpForm({ emailOrUsername, className = "" }) {
  return (
    <div className={cn("grid gap-6", className)}>
      <div className="text-center  px-4 py-6 rounded-md text-sm text-primary">
        <p className="mb-1">
          We&apos;ve sent a verification link to your email:{" "}
          <strong className="animate-spin">{emailOrUsername}</strong>
        </p>
        <p>
          <a href="/" className="underline text-muted-foreground hover:text-blue-800">
            return to Login Page
          </a>
        </p>
      </div>
    </div>
  );
}

