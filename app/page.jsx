// app\page.jsx
"use client";
import UserAuthForm from "@/components/user-auth-form";
import ForgotPasswordForm from "@/components/forgot-password-form";
import VerifyOtpForm from "@/components/verify-otp-form";
import BrandLogo from "@/components/brand-logo";
import { useBranding } from "@/lib/use-branding";
import "./globals.css";
import withAuth from "@/components/withAuth";
import { useEffect, useState } from "react";

const LoginPage = () => {
  const branding = useBranding();
  const [mode, setMode] = useState("signIn");
  const [emailOrUsername, setEmailOrUsername] = useState(""); // store for OTP step

  useEffect(() => {
    sessionStorage.clear();
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }, []);

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[url('/image1.jpg')] bg-contain bg-card bg-no-repeat bg-center justify-center items-center" />
        <div className="relative z-20 flex items-center text-lg font-medium" />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <BrandLogo className="w-100 h-42" branding={branding} />
            <h1 className="text-lg font-semibold">{branding.appName}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signIn" && "Enter your Login Details"}
              {mode === "forgotPassword" &&
                "Enter your Details to reset your password."}
              {mode === "verifyOtp" && "Verify OTP and Reset Password"}
            </p>
          </div>

          {mode === "signIn" && <UserAuthForm />}

          {mode === "forgotPassword" && (
            <ForgotPasswordForm
              onSuccess={(email) => {
                setEmailOrUsername(email);
                setMode("verifyOtp");
              }}
            />
          )}

          {mode === "verifyOtp" && (
            <VerifyOtpForm
              emailOrUsername={emailOrUsername}
              onSuccess={() => setMode("signIn")}
            />
          )}

          <div className="flex flex-col space-y-2 text-center">
            {mode === "signIn" && (
              <p
                className="text-sm text-primary hover:underline cursor-pointer"
                onClick={() => setMode("forgotPassword")}
              >
                Forgot password?
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(LoginPage);

