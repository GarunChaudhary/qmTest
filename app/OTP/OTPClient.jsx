// app/OTP/OTPClient.jsx
"use client";

import { useEffect } from "react";
import OTPForm from "@/components/otp-form";
import BrandLogo from "@/components/brand-logo";
import { useBranding } from "@/lib/use-branding";
import "/app/globals.css";
import { useSearchParams } from "next/navigation";

export default function OTPClient() {
  const branding = useBranding();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    sessionStorage.removeItem("otpVerified");
    sessionStorage.setItem("otpEmail", email);
  }, [email]);

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[url('/image1.jpg')] bg-contain bg-card bg-no-repeat bg-center justify-center items-center" />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <BrandLogo className="w-100 h-42" branding={branding} />
            <h1 className="text-lg font-semibold">{branding.appName}</h1>
            <p className="text-sm text-muted-foreground">
              Enter the OTP sent to your email
            </p>
          </div>
          <OTPForm email={email} />
        </div>
      </div>
    </div>
  );
}

