
"use client";
import { useEffect } from "react";

export default function useIdleTimeout(onIdle, timeout) {
  useEffect(() => {
    let idleTimeout;

    const resetTimeout = () => {
      try {
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(onIdle, timeout);
      } catch (error) {
        console.error("Error in resetting idle timeout:", error);
      }
    };

    const handleUserActivity = () => {
      try {
        resetTimeout();
      } catch (error) {
        console.error("Error handling user activity:", error);
      }
    };

    try {
      // Attach event listeners for various user activities
      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keydown", handleUserActivity);
      window.addEventListener("click", handleUserActivity);
      window.addEventListener("scroll", handleUserActivity);

      // Start the timeout
      resetTimeout();
    } catch (error) {
      console.error(
        "Error attaching event listeners or starting timeout:",
        error
      );
    }

    // Cleanup on component unmount
    return () => {
      try {
        clearTimeout(idleTimeout);
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("scroll", handleUserActivity);
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, [onIdle, timeout]);
}
