"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

/** `large`: tinggi 42px (halaman Akun), default: kecil (sidebar admin). */
export function SignOutButton({ large = false }: { large?: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant={large ? "outline" : "ghost"}
      size={large ? "default" : "sm"}
      className={large ? "h-[42px] rounded-xl px-4 text-sm" : undefined}
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
