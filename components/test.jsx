"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer, VideoPlayer } from "@/components/audio-player";
import { Card, CardContent } from "@/components/ui/card";
import InterationToolbar from "@/components/interation-toolbar";
import withAuth from "@/components/withAuth";
import CryptoJS from 'crypto-js';
import NotFound from "@/components/NotFound";
import { notFound, useSearchParams } from "next/navigation";

const Interaction = ({ params }) => {
  const { id } = params;

  const searchParams = useSearchParams(); // query params

  const formId = searchParams.get("form_id"); // "abc456"
  const UserId = searchParams.get("user_id");
  const Status = searchParams.get("Status");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [fileExtension, setFileExtention] = useState(null);
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [notfound, setNotFound] = useState(false);

  const hasPrivilege = (privId) =>
    grantedPrivileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 6, // Users module
            orgId: sessionStorage.getItem("selectedOrgId") || "",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setGrantedPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);
      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);


  const fetchInteractionData = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let userId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

      let timezone = null;

      if (encryptedTimezone) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          timezone = JSON.parse(decryptedData);
        } catch (err) {
          console.error("Failed to decrypt timezone:", err);
        }
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: userId || "",
        timezone: timezone,
        requestType: "SELECTED",
      };

      const response = await fetch(`/api/interactions/${id}`, { headers });

      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await response.json();
      setData(data.interactions[0]);

      if (response.ok) {
        // const filePath = data.interactions[0].fileLocation;
        // const fileSourceType = data.interactions[0].fileSourceType;
        // const extension = filePath.split('.').pop().toLowerCase();
        // setFileExtention(extension);
        const filePath = data.interactions[0].fileLocation;
        const fileSourceType = data.interactions[0].fileSourceType;

        // If no file path → no audio/video available
        if (!filePath) {
          setFileExtention(null);
          setAudioUrl(null);
          return;
        }

        const extension = filePath.split('.').pop().toLowerCase();
        setFileExtention(extension);

        try {
          const audioResponse = await fetch(
            `/api/audio?filePath=${encodeURIComponent(filePath)}&fileSourceType=${encodeURIComponent(fileSourceType)}`,
            { headers }
          );
          if (!audioResponse.ok) {
            if (audioResponse.status === 404) {
              throw new Error("Audio file not found for the interaction");
            } else {
              throw new Error(`Failed to fetch audio`);
            }
          }
          const audioBlob = await audioResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(audioUrl);
        } catch (error) {
          console.error("Error fetching audio:", error);
          setAudioError(error.message || "Error fetching audio file")
        }
      } else {
        setError("Error fetching interaction data");
      }
    } catch (err) {
      setError(err.message || "Unexpected error");
    }
  }, [id]);

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchInteractionData();
    }
  }, [id, privilegesLoaded, fetchInteractionData]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  if (notfound) {
    return (
      <NotFound
        message="This page does not exist."
        redirectUrl="/dashboard/interactions"
        redirectText="Go Back"
      />
    );
  }

  if (error) {
    return <div>Error loading interaction: {error}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard/interactions" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
      </div>

      {hasPrivilege(1) ? (
        <Card>
          <CardContent className="p-0 pt-4 pb-4">
            {/* {audioError === null ? ( */}
            {!fileExtension ? (
              <p className="flex justify-center items-center w-full py-4 text-red-500">
                No audio available for this interaction.
              </p>
            ) : audioError === null ? (
              fileExtension === "mp3" || fileExtension === "wav" || fileExtension === "ogg" ? (
                <AudioPlayer AURL={audioUrl} grantedPrivileges={grantedPrivileges} transcriptionFilePath={data.transcriptionfilepath} fileSourceType={data.fileSourceType} />
              ) : fileExtension === "mp4" || fileExtension === "avi" || fileExtension === "mov" ? (
                <VideoPlayer VURL={audioUrl} grantedPrivileges={grantedPrivileges} />
              ) : (
                <p className="ml-5 text-yellow-500">Unsupported file type.</p>
              )
            ) : (
              <p className="text-red-500 text-center">{audioError}</p>
            )
            }
          </CardContent>
        </Card>
      ) : (
        <p>Loading...</p>
      )}

      <InterationToolbar formData={data} formId={formId} UserId={UserId} Status={Status} />
    </div>
  );
};

export default withAuth(Interaction);
