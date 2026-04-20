"use client";
import * as React from "react";
import CryptoJS from "crypto-js";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/lib/icons";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or LoginId is required"),
  password: z.string().min(1, "Password is required"),
});

export function UserAuthForm(props = {}, className = "") {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(FormSchema),
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();

  const onSubmit = async (data) => {
    setIsLoading(true);
    clearErrors(); // Clear previous errors before making a new request

    let response; // Declare response variable outside the try block
    try {
      const secretKey =
        process.env.NEXT_PUBLIC_CLIENT_ENCRYPT_KEY || "mySecretKey123"; // same key server side bhi honi chahiye

      const encryptedPayload = CryptoJS.AES.encrypt(
        JSON.stringify({
          username: data.emailOrUsername,
          password: data.password,
        }),
        secretKey
      ).toString();

      response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({ payload: encryptedPayload }),
      });

      const result = await response.json();

      if (response.ok) {
        const encryptedUser = CryptoJS.AES.encrypt(
          JSON.stringify(result.user),
          ""
        ).toString();
        const encryptedtoken = CryptoJS.AES.encrypt(
          JSON.stringify(result.token),
          ""
        ).toString();
        //sessionStorage.setItem("tempDashboardData", encryptedText);
        sessionStorage.setItem("token", encryptedtoken);
        sessionStorage.setItem("user", encryptedUser);
        const user = result.user || null;
        if (user) {
          try {
            const encryptedUser = CryptoJS.AES.encrypt(
              JSON.stringify({
                userId: user.userId,
                userFullName: user.userFullName,
                userRoles: user.userRoles,
                email: user.email,
                organization: user.organization || [],
                // DO NOT store email/password or other sensitive fields
              }),
              ""
            ).toString();
            sessionStorage.setItem("user", encryptedUser);

            const primaryOrgId = user?.organization?.[0]?.orgId;
            if (primaryOrgId) {
              sessionStorage.setItem("selectedOrgId", String(primaryOrgId));
            }
          } catch (e) {
            console.warn("Could not store user info locally", e);
          }
        }

        // After login, call protected APIs — browser will include cookie automatically.
        // Modules/permissions calls should not send Authorization header or loggedInUserId.
        const [modules, permissions] = await Promise.all([
          fetchModules(),
          fetchPermissions(),
          loadRoles(),
        ]);

        const redirectPath = getFirstPermittedPath(modules, permissions);
        // after getting redirectPath from getFirstPermittedPath...
        // if (redirectPath) {
        //   // store for later (so mobile-not-supported can read it)
        //   try {
        //     sessionStorage.setItem("redirectPath", redirectPath);
        //   } catch (e) {
        //     console.warn("Could not persist redirectPath", e);
        //   }
        //   router.push(redirectPath);
        // } else {
        //   alert("You don't have access to any modules.");
        // }
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          alert("You don't have access to any modules.");
        }
      } else {
        const errorMessage =
          result?.message ||
          "An unexpected error occurred. Please try again later.";
        setError("generic", { message: errorMessage });
        return;
      }
    } catch (error) {
      // Handle errors based on the response status if response is defined
      if (response) {
        if (response.status === 400) {
          setError("generic", {
            message: "Invalid username or password format.",
          });
        } else if (response.status === 404) {
          setError("generic", {
            message: "Username or email does not exist.",
          });
        } else if (response.status === 401) {
          setError("generic", {
            message: "Incorrect username or password.",
          });
        } else if (response.status === 403) {
          setError("generic", {
            message: "Your account does not exists.",
          });
        } else {
          // Handle any other unexpected errors
          setError("generic", {
            message: "An unexpected error occurred. Please try again later.",
          });
        }
      } else {
        // Handle network or unexpected errors
        setError("generic", {
          message: "An unexpected error occurred. Please try again later.",
        });
      }

      console.error("Login error:", error); // Log the error for debugging
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    const orgId = sessionStorage.getItem("selectedOrgId");
    const response = await fetch("/api/modules", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { orgId } : {}),
      },
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch modules: ${response.status}`);
    }
    const data = await response.json();
    return data.navbarModules || [];
  };

  const fetchPermissions = async () => {
    const orgId = sessionStorage.getItem("selectedOrgId");
    const response = await fetch("/api/permission", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { orgId } : {}),
      },
      credentials: "include",
    });
    if (!response.ok) {
      console.error(`Failed to fetch permissions: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.permissionModel || [];
  };

  const getFirstPermittedPath = (modules, permissions) => {
    const allowedModuleIds = permissions.map((perm) => perm.moduleId);
    const restrictedModuleIds = permissions
      .filter((perm) => perm.privilegeId === 11)
      .map((perm) => perm.moduleId);

    const allowedModules = modules.filter(
      (mod) =>
        (allowedModuleIds.includes(mod.id) ||
          allowedModuleIds.includes(mod.menuSequenceNo)) &&
        !restrictedModuleIds.includes(mod.id) &&
        !restrictedModuleIds.includes(mod.menuSequenceNo)
    );

    const hasFormsAccess = allowedModules.some((m) =>
      [5, 9].includes(m.menuSequenceNo)
    );
    const hasManagementAccess = allowedModules.some((m) =>
      [2, 7, 8].includes(m.menuSequenceNo)
    );

    const preferred = allowedModules.find(
      (m) =>
        m.redirectPath &&
        ![5, 9, 2, 7, 8].includes(m.menuSequenceNo)
    );

    if (preferred?.redirectPath) return preferred.redirectPath;
    if (hasFormsAccess) return "/dashboard/forms-combined";
    if (hasManagementAccess) return "/dashboard/Management_combined_page";
    return allowedModules?.[0]?.redirectPath || null;
  };

  const loadRoles = async () => {
    try {
      const response = await fetch("/api/dashboard/agentroleids", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch roles");

      const result = await response.json();
      sessionStorage.setItem("agentRoles", JSON.stringify(result.roleids || []));
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form
        method="POST"
        onSubmit={(e) => {
          e.preventDefault();

          handleSubmit(onSubmit)();
        }}
      >
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="emailOrUsername">
              Email or LoginId
            </Label>
            <Input
              id="emailOrUsername"
              name="emailOrUsername"
              placeholder="Email or LoginId"
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              disabled={isLoading}
              {...register("emailOrUsername")}
            />
            {errors.emailOrUsername && (
              <p className="text-destructive text-xs">
                {errors.emailOrUsername.message}
              </p>
            )}
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                disabled={isLoading}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-xs">
                {errors.password.message}
              </p>
            )}
          </div>
          <p className="text-center text-destructive text-xs">
            {errors.generic ? errors.generic.message : ""}
          </p>
          <Button disabled={isLoading || isSubmitting} type="submit">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign In
          </Button>
        </div>
      </form>
    </div>
  );
}

export default UserAuthForm;
