"use client";

import { useEffect, useMemo, useRef } from "react";

const BUS_KEY = "__callMonitoringWhisperBus";

function getWhisperBus() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window[BUS_KEY]) {
    window[BUS_KEY] = new EventTarget();
  }

  return window[BUS_KEY];
}

export function useWhisperSocket(activeMonitoringSession) {
  const listenersRef = useRef([]);

  const socket = useMemo(() => {
    if (!activeMonitoringSession?.sessionId) {
      return null;
    }

    const bus = getWhisperBus();
    if (!bus) {
      return null;
    }

    const disconnect = () => {
      listenersRef.current.forEach(({ eventName, wrappedHandler }) => {
        bus.removeEventListener(eventName, wrappedHandler);
      });
      listenersRef.current = [];
    };

    return {
      emit(eventName, payload) {
        bus.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ...payload,
              __sentAt: Date.now(),
            },
          })
        );
      },
      on(eventName, handler) {
        const wrappedHandler = (event) => {
          const payload = event.detail;

          if (!payload || payload.sessionId !== activeMonitoringSession.sessionId) {
            return;
          }

          if (
            activeMonitoringSession.agentId &&
            payload.agentId &&
            payload.agentId !== activeMonitoringSession.agentId
          ) {
            return;
          }

          handler(payload);
        };

        bus.addEventListener(eventName, wrappedHandler);
        listenersRef.current.push({ eventName, wrappedHandler });

        return () => {
          bus.removeEventListener(eventName, wrappedHandler);
          listenersRef.current = listenersRef.current.filter(
            (listener) => listener.wrappedHandler !== wrappedHandler
          );
        };
      },
      disconnect,
    };
  }, [activeMonitoringSession]);

  useEffect(() => {
    return () => {
      socket?.disconnect?.();
    };
  }, [socket]);

  return socket;
}
