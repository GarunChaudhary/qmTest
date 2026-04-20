// app/set-password/page.jsx

"use client";

import SetPasswordForm from "@/components/set-password-form";
import "/app/globals.css";

export default function SetPasswordPage() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[url('/image1.jpg')] bg-contain bg-card bg-no-repeat bg-center justify-center items-center" />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-bold">Set New Password</h1>
            <p className="text-sm text-muted-foreground">
              Create a new password for your account.
            </p>
          </div>
          <SetPasswordForm />
        </div>
      </div>
    </div>
  );
}

