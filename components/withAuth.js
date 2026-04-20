"use client"; // Ensure this runs as a client component
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const withAuth = (WrappedComponent) => {
  const AuthenticatedComponent = (props) => {
    const router = useRouter();

    useEffect(() => {
      const token = sessionStorage.getItem("token");

      if (!token) {
        // Redirect to the login page if the user is not authenticated
        router.replace("/"); // Use replace instead of push to prevent history entry
      }
    }, [router]);

    return <WrappedComponent {...props} />;
  };

  // Set a display name for easier debugging in React DevTools
  AuthenticatedComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return AuthenticatedComponent;
};

export default withAuth;
