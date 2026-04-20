"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function getWidgetRequestHeaders() {
  const widgetKey = process.env.NEXT_PUBLIC_CALL_MONITORING_WIDGET_KEY;

  if (!widgetKey) {
    return undefined;
  }

  return {
    "x-call-monitoring-widget-key": widgetKey,
  };
}

export function usePollingResource(url, intervalMs = 7000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState("");
  const abortControllerRef = useRef(null);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError("");

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: getWidgetRequestHeaders(),
        signal: controller.signal,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || json?.error || `Request failed with ${response.status}`);
      }

      setData(json);
      setRefreshedAt(new Date().toLocaleTimeString());
    } catch (error) {
      if (error.name !== "AbortError") {
        setError(error.message || "Unable to load data.");
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();

    const timer = window.setInterval(load, intervalMs);

    return () => {
      window.clearInterval(timer);
      abortControllerRef.current?.abort();
    };
  }, [intervalMs, load]);

  return {
    data,
    error,
    loading,
    refreshedAt,
    reload: load,
  };
}
