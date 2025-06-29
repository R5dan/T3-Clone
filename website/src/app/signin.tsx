"use client";

import { Button } from "~/components/ui/button";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useRouter } from "next/navigation";

export function GlobalAuthButtons() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading || user) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
      }}
    >
      <Button variant="outline" onClick={() => router.push("/auth/login")}>
        Sign In
      </Button>
      <Button variant="default" onClick={() => router.push("/auth/signup")}>
        Sign Up
      </Button>
    </div>
  );
}

export default function SignIn() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Sign In / Sign Up
        </h1>
        <Button className="mb-4 w-full" variant="default">
          Sign In with Provider
        </Button>
        <Button className="w-full" variant="outline">
          Sign Up
        </Button>
      </div>
    </div>
  );
}
