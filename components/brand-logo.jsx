// components/brand-logo.jsx
"use client";

import { Icons } from "@/lib/icons";
import { useBranding } from "@/lib/use-branding";

export default function BrandLogo({ className = "w-100 h-42", alt }) {
  const branding = useBranding();

  const logoUrl = branding.logoUrl?.trim();

  // Case 1: Khali hai ya default SVG chahiye
  if (!logoUrl || logoUrl === "" || logoUrl === "/arviusLogoFull") {
    return (
      <Icons.arviusLogoFull
        className={className}
        aria-label={alt || branding.appName}
      />
    );
  }

  // Case 2 & 3: Real image — /logo.png ya https://...
  return (
    <img
      src={logoUrl}
      alt={alt || branding.appName}
      className={className}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
