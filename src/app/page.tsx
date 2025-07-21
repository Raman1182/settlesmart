
"use client";

import { useSettleSmart } from "@/context/settle-smart-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Dashboard } from "@/components/dashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { currentUser, isLoading } = useSettleSmart();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading user data...</p>
      </div>
    );
  }

  return <Dashboard />;
}
