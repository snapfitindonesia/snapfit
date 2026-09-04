"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut();
        router.push("/masuk");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
      Keluar
    </Button>
  );
}
