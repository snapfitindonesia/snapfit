import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";
import { ShoppingBag, ChevronRight, Coins } from "lucide-react";
import { getMyCoins } from "@/lib/actions/coins";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountButton } from "@/components/auth/delete-account-button";

export const metadata = { title: "Akun" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  const coins = user ? await getMyCoins() : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Akun</h1>

      {user ? (
        <div className="mt-6 rounded-lg border border-border p-5">
          <p className="text-sm text-muted-foreground">Masuk sebagai</p>
          <p className="mt-1 font-medium">{user.email}</p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      ) : null}

      {user && (
        <>
          {coins?.loggedIn && (
            <Link
              href="/akun/koin"
              className="mt-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-5 transition-colors hover:bg-amber-100"
            >
              <Coins className="size-5 text-amber-700" />
              <span className="flex-1">
                <span className="block text-xs text-amber-900/80">Koin SNAPFIT</span>
                <span className="block text-xl font-semibold text-amber-950">{coins.balance.toLocaleString("id-ID")}</span>
                {coins.expiringSoon > 0 && (
                  <span className="block text-xs text-amber-900">
                    {coins.expiringSoon.toLocaleString("id-ID")} koin hangus minggu ini — pakai sebelum hilang
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 text-amber-700" />
            </Link>
          )}
          <Link
            href="/akun/pesanan"
            className="mt-4 flex items-center gap-3 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
          >
            <ShoppingBag className="size-5 text-muted-foreground" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">Pesanan Saya</span>
              <span className="block text-xs text-muted-foreground">Lihat riwayat & status pesanan</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>

          <div className="mt-4 rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold">Ganti Password</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Buat password baru untuk akunmu.</p>
            <ChangePasswordForm />
          </div>

          <div className="mt-4 rounded-lg border border-destructive/30 p-5">
            <h2 className="text-sm font-semibold text-destructive">Hapus Akun</h2>
            <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
              Menghapus akun bersifat permanen dan tidak bisa dibatalkan. Kamu tidak akan bisa login lagi dengan akun ini.
            </p>
            <DeleteAccountButton />
          </div>
        </>
      )}

      {!user && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Masuk untuk melihat pesanan, dapat 2.000 koin member & cashback 2% tiap belanja.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/masuk">Masuk</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/daftar">Daftar</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
