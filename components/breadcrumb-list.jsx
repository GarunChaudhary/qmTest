 "use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";

const breadcrumbNameMap = {
  QMagent:"Dashboard",
  dashboard1: "Dashboard",
  users: "Users",
  interactions: "Interactions",
  builder: "Forms",
  agentOrganization: "Agent Organization",
  organization: "Organization",
  roleManagement: "Role Management",
  Management_combined_page: "User Management",
  "forms-combined": "Form Management"
};

const BreadCrumbListWrapper = () => {
  const pathname = usePathname();
  const pathnames = pathname?.split("/").filter((x) => x);
  const secondPathname = pathnames?.[1];
  return (
    <>
      {secondPathname && (
        <Breadcrumb className="hidden md:flex" key={"breadcrumb"}>
          <BreadcrumbList key={"breadcrumbList_" + Math.random()}>
            <div className="contents">
              <BreadcrumbItem key={"breadcrumbItem_0"}>
                {/* Use span to make the breadcrumb unclickable */}
                <span className="capitalize">
                  {breadcrumbNameMap[secondPathname] || secondPathname}
                </span>
              </BreadcrumbItem>
            </div>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </>
  );
};

export default BreadCrumbListWrapper;
