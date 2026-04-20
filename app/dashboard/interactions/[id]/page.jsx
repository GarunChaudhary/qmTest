// app/dashboard/interactions/[id]/page.jsx

"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FaDownload } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import InterationToolbar from "@/components/interation-toolbar";
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";
import { useSearchParams } from "next/navigation";

const InteractionInner = ({ params }) => {
  const { id } = params;
  const searchParams = useSearchParams();
  const router = useRouter();

  const formId = searchParams.get("form_id");
  const UserId = searchParams.get("user_id");
  const Status = searchParams.get("Status");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [fileExtension, setFileExtension] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);

  const hasPrivilege = (id) =>
    grantedPrivileges.some((p) => p.PrivilegeId === id);

  /* ---------------- Privileges ---------------- */
  useEffect(() => {
    const fetchPrivileges = async () => {
      const encrypted = sessionStorage.getItem("user");
      const bytes = CryptoJS.AES.decrypt(encrypted || "", "");
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

      const res = await fetch("/api/privileges", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: user?.userId,
          moduleId: 6, 
          orgId: sessionStorage.getItem("selectedOrgId") || "",
        },
      });

      const result = await res.json();
      setGrantedPrivileges(result.privileges || []);
      setPrivilegesLoaded(true);
    };

    fetchPrivileges();
  }, []);

  /* ---------------- Interaction Data ---------------- */

  const normalizeInteraction = useCallback((row) => {
    if (!row) return null;
    return {
      ...row,
      id: row.id ?? row.interactionId ?? row.interaction_id ?? row.callId ?? row.call_id,
      callId: row.callId ?? row.call_id ?? row.interactionId ?? row.interaction_id,
      fileLocation: row.fileLocation ?? row.file_location ?? row.filepath ?? null,
      fileSourceType: row.fileSourceType ?? row.file_source_type ?? null,
      transcriptionfilepath:
        row.transcriptionfilepath ?? row.transcription_file_path ?? null,
      transcription_source_type:
        row.transcription_source_type ?? null,
      audioStartTime: row.audioStartTime ?? row.audio_start_time ?? null,
      audioEndTime: row.audioEndTime ?? row.audio_end_time ?? null,
      localStartTime: row.localStartTime ?? row.local_start_time ?? null,
      localEndTime: row.localEndTime ?? row.local_end_time ?? null,
      personalName: row.personalName ?? row.personal_name ?? null,
      pbxLoginId: row.pbxLoginId ?? row.pbx_login_id ?? null,
      audioModuleNo: row.audioModuleNo ?? row.audio_module_no ?? null,
      audioChannelNo: row.audioChannelNo ?? row.audio_ch_no ?? null,
      agentId: row.agentId ?? row.agent_id ?? null,
      switchCallId: row.switchCallId ?? row.switch_call_id ?? null,
    };
  }, []);

  const fetchInteraction = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let userId = null;
      let userName = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
          userName = user?.userFullName || null;
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
        userName: userName || "",
        timezone: timezone,
        requestType: "SELECTED",
      };

      const response = await fetch(`/api/interactions/${id}`, { headers });

      let resolvedData = null;

      if (response.status === 404) {
        // Fallback: lookup by callId using existing interactions search API
        const fallbackResponse = await fetch(`/api/interactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({
            pageNo: 1,
            rowCountPerPage: 1,
            search: null,
            queryType: 1,
            fromDate: null,
            toDate: null,
            callId: id,
            ucid: null,
            agent: null,
            durationBucketIds: [],
            aniDni: null,
            formIds: [],
            evaluatorIds: [],
            organizationIds: [],
            agentNameIds: [],
            extensions: null,
            currentUserId: userId,
            timezone,
            ActiveStatus: 0,
            privilegeId: 0,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData?.interactions?.length) {
            resolvedData = fallbackData.interactions[0];
          }
        }
      } else if (response.ok) {
        const data = await response.json();
        if (data?.interactions?.length) {
          resolvedData = data.interactions[0];
        }
      }

      if (!resolvedData) {
        setError("Interaction not found");
        return;
      }

      const normalized = normalizeInteraction(resolvedData);
      setData(normalized);

      if (normalized) {
        // const filePath = resolvedData.fileLocation;
        // const fileSourceType = resolvedData.fileSourceType;
        // const extension = filePath.split('.').pop().toLowerCase();
        // setFileExtention(extension);
        const filePath = normalized.fileLocation;
        const fileSourceType = normalized.fileSourceType;
        const interactionIdForAudio = normalized.id || id;

        // If no file path → no audio/video available
        if (!filePath) {
          setFileExtension(null);
          setAudioUrl(null);
          return;
        }

        const extension = filePath.split(".").pop().toLowerCase();
        setFileExtension(extension);

        try {
          // Check sessionStorage cache first (survives refresh within the same tab session)
          const cacheKey = `audio_cache_${interactionIdForAudio}`;
          const cached = sessionStorage.getItem(cacheKey);

          if (cached) {
            // Rebuild blob URL from cached base64
            try {
              const { base64, mimeType } = JSON.parse(cached);
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type: mimeType });
              setAudioUrl(URL.createObjectURL(blob));
              return;
            } catch (_) {
              sessionStorage.removeItem(cacheKey); // corrupt cache — fall through to fetch
            }
          }

          const audioResponse = await fetch(
            `/api/audio?filePath=${encodeURIComponent(filePath)}&interactionId=${interactionIdForAudio}&fileSourceType=${encodeURIComponent(fileSourceType)}&actionType=load`,
            { headers },
          );
          if (!audioResponse.ok) {
            throw new Error(
              audioResponse.status === 404
                ? "Audio file not found for the interaction"
                : "Failed to fetch audio"
            );
          }
          const audioBlob = await audioResponse.blob();

          // Cache to sessionStorage as base64 (persists across refresh in same tab)
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(",")[1];
              const payload = JSON.stringify({ base64, mimeType: audioBlob.type || "audio/wav" });
              // Only cache if under ~50 MB (sessionStorage limit ~5-10 MB per origin)
              if (payload.length < 50 * 1024 * 1024) {
                try { sessionStorage.setItem(cacheKey, payload); } catch (_) { /* quota exceeded — skip */ }
              }
            };
            reader.readAsDataURL(audioBlob);
          } catch (_) {
            // Ignore cache write failures for audio blobs.
          }

          setAudioUrl(URL.createObjectURL(audioBlob));
        } catch (error) {
          console.error("Error fetching audio:", error);
          setAudioError(error.message || "Error fetching audio file");
        }
      } else {
        setError("Error fetching interaction data");
      }
    } catch (err) {
      setError(err.message || "Unexpected error");
    }
  }, [id, normalizeInteraction]);

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchInteraction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privilegesLoaded, fetchInteraction]);

  const downloadAudio = async () => {
    const encryptedUserData = sessionStorage.getItem("user");
    const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
    const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

    const headers = {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      loggedInUserId: user?.userId,
      userName: user?.userFullName,
    };

    const interactionIdForAudio = data?.id || id;

    // ── Download audio ──
    const audioResponse = await fetch(
      `/api/audio?filePath=${encodeURIComponent(data.fileLocation)}&interactionId=${interactionIdForAudio}&fileSourceType=${encodeURIComponent(data.fileSourceType)}&actionType=download`,
      { headers },
    );
    if (audioResponse.ok) {
      const blob = await audioResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interaction_${interactionIdForAudio}.${fileExtension}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    // ── Download transcription (if path exists) ──
    const transcriptionPath = data?.transcriptionfilepath;
    const transcriptionSrcType = data?.transcription_source_type || data?.fileSourceType || "local";
    if (transcriptionPath && transcriptionPath.trim()) {
      try {
        const tRes = await fetch(
          `/api/read-transcription?path=${encodeURIComponent(transcriptionPath)}&fileSourceType=${encodeURIComponent(transcriptionSrcType)}`,
          { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` } },
        );
        if (tRes.ok) {
          const tBlob = await tRes.blob();
          const tUrl = window.URL.createObjectURL(tBlob);
          const ta = document.createElement("a");
          ta.href = tUrl;
          ta.download = `${interactionIdForAudio}_transcription.json`;
          ta.click();
          window.URL.revokeObjectURL(tUrl);
        }
      } catch (_) {
        // Ignore transcription download failures.
      }
    }
  };

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  if (!privilegesLoaded) return <p>Loading...</p>;
  if (!hasPrivilege(1)) return <p>Unauthorized.</p>;

  const safeData =
    data ||
    ({
      id,
      callId: id,
      fileLocation: null,
      fileSourceType: null,
      transcriptionfilepath: null,
    });

  return (
    <div className="min-h-screen">
      <InterationToolbar
        formData={safeData}
        formId={formId}
        UserId={UserId}
        Status={Status}
        audioUrl={audioUrl}
        fileExtension={fileExtension}
        audioError={audioError}
        grantedPrivileges={grantedPrivileges}
        onBack={() => router.back()}
        downloadNode={
          audioUrl ? (
            <Button
              onClick={downloadAudio}
              className="text-xs px-3 py-1 h-8 flex items-center gap-2"
            >
              <FaDownload className="h-3 w-3" />
              Download Call
            </Button>
          ) : null
        }
      />
    </div>
  );
};

const Interaction = ({ params }) => (
  <Suspense fallback={<p className="text-xs text-muted-foreground p-4">Loading...</p>}>
    <InteractionInner params={params} />
  </Suspense>
);

export default withAuth(Interaction);
