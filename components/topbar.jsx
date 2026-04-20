// components\topbar.jsx
"use client";
import { Button } from "@/components/ui/button";
import CryptoJS from "crypto-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelLeft } from "lucide-react";
import Image from "next/image";
import Navbar from "./navbar";
import ProfileDisplay from "./profile-display";
import ResetPassword from "./reset-password";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import BreadCrumbListWrapper from "./breadcrumb-list";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";

const Topbar = () => {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState("/noavatar.png");
  const [error, setError] = useState(null);
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const nameRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const userData = sessionStorage.getItem("user");
      if (userData) {
        const bytes = CryptoJS.AES.decrypt(userData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        setUserEmail(user?.email || "email@email.com");
        setUserRole(user?.userRole || "");
        setUserName(user?.userFullName || user?.user_login_id || user?.loginId || "");
        setUserId(user?.userId ?? null);
      }
    } catch (err) {
      console.error("Error accessing sessionStorage:", err);
      setError("Failed to load user data");
    }
  }, []);

  useEffect(() => {
    const handlePictureUpdated = (e) => {
      if (e?.detail?.picturePath) {
        setAvatarSrc(e.detail.picturePath);
      }
    };
    window.addEventListener("profile:picture-updated", handlePictureUpdated);
    return () =>
      window.removeEventListener("profile:picture-updated", handlePictureUpdated);
  }, []);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!userId) return;
      try {
        const res = await fetch("/api/profileDisplay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ userId }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.data?.profile_picture) {
          setAvatarSrc(data.data.profile_picture);
        }
      } catch (err) {
        console.error("Failed to load profile picture:", err);
      }
    };
    fetchProfilePicture();
  }, [userId]);

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      let userLoginId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        userId = decrypted?.userId;
        userLoginId = decrypted?.userFullName;
      }

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("visibilityRules");
      sessionStorage.removeItem("selectedModuleId");
      sessionStorage.removeItem("scoringRules");
      sessionStorage.removeItem("scoringRules");
      sessionStorage.removeItem("disabledOptions");
      sessionStorage.removeItem("tempDashboardData");
      sessionStorage.removeItem("selectedTimezone");
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure";

      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          userName: userLoginId,
        },
      });
      if (response.ok) {
        router.push("/");
      } else {
        setError("Failed to log out on the server. Please try again.");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      setError("Failed to logout. Please try again.");
    }
  };

  const smallTextStyle = { fontSize: "0.775rem" };

  const fullDisplayName = (userName || userEmail || "").trim();

  // Show only first letter + ellipsis if name is longer than 12 chars
  const compactDisplayName =
    fullDisplayName.length > 12
      ? `${fullDisplayName.charAt(0)}…`
      : fullDisplayName;

  const handleNameMouseEnter = () => {
    const el = nameRef.current;
    // Show tooltip whenever name is truncated (compact version shown)
    if (fullDisplayName.length > 12) {
      setShowNameTooltip(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <Navbar />
        </SheetContent>
      </Sheet>
      <BreadCrumbListWrapper />
      <div className="relative ml-auto flex-1 md:grow-0"></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 shadow-sm hover:bg-muted/40"
          >
            <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full">
              <Image
                src={avatarSrc || "/noavatar.png"}
                width={32}
                height={32}
                alt="Avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
            </span>

            {/* Name with tooltip */}
            <span className="relative hidden sm:inline-flex items-center">
              <span
                ref={nameRef}
                className="max-w-[140px] truncate text-xs font-medium text-foreground"
                onMouseEnter={handleNameMouseEnter}
                onMouseLeave={() => setShowNameTooltip(false)}
              >
                {compactDisplayName}
              </span>

              {/* Tooltip */}
              {showNameTooltip && (
                <span
                  className="absolute right-0 -top-9 z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-xl pointer-events-none"
                >
                  {fullDisplayName}
                  {/* Arrow */}
                  <span
                    className="absolute right-3 top-full w-0 h-0"
                    style={{
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: `5px solid hsl(var(--foreground))`,
                    }}
                  />
                </span>
              )}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel style={smallTextStyle}>
            {userEmail}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full mb-2"
                  style={smallTextStyle}
                >
                  Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] max-w-2xl sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                <DialogTitle className="text-xl font-semibold mb-4">
                  Profile
                </DialogTitle>
                <ProfileDisplay />
              </DialogContent>
            </Dialog>
          </DropdownMenuItem>

          {userRole !== "Admin" && (
            <DropdownMenuItem asChild>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full mb-2"
                    style={smallTextStyle}
                  >
                    Reset Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Reset Password</DialogTitle>
                  <ResetPassword />
                </DialogContent>
              </Dialog>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleLogout} style={smallTextStyle}>
            <Button
              variant="ghost"
              className="w-full text-red-500"
              style={smallTextStyle}
            >
              Logout
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <div className="error-message">{error}</div>}
    </header>
  );
};

export default withAuth(Topbar);