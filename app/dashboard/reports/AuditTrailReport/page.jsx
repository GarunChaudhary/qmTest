// app/dashboard/reports/AuditTrailReport/page.jsx

"use client";

import React, { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import DynamicReportDataTable from "@/components/dataTable/Dynamic-Report-DataTable";

function AuditTrailReport() {
  const [data, setData] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [rowCountPerPage, setRowCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    try {
      let userId = null;

      const encryptedUserData = sessionStorage.getItem("user");

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);

        userId = user?.userId || null;
      }

      const response = await fetch("/api/reports/AuditTrailReport", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
        },

        body: JSON.stringify({
          pageNo,
          rowCountPerPage,
          queryType: 0,
        }),

        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok && result?.success) {
        setData(result.data.auditData || []);
        setTotalCount(result.data.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNo, rowCountPerPage]);

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard/reports" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-lg font-semibold">Audit Trail Report</h1>

        <div />
      </div>

      {/* Table */}

      {loading ? (
        <p className="text-xs">Loading...</p>
      ) : (
        <DynamicReportDataTable
          data={data}
          totalCount={totalCount}
          pageNo={pageNo}
          rowCountPerPage={rowCountPerPage}
          onPageChange={setPageNo}
          onRowCountChange={(count) => {
            setRowCountPerPage(count);
            setPageNo(1);
          }}
        />
      )}
    </div>
  );
}

export default withAuth(AuditTrailReport);
