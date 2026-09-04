import { MfaPanel } from "@/components/auth/mfa-panel";

export const metadata = { title: "Verifikasi MFA — Admin" };

// Halaman ini dikecualikan dari syarat AAL2 di middleware (agar admin bisa enroll/challenge).
export default function AdminMfaPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-xl font-semibold">Verifikasi dua langkah</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin wajib MFA untuk masuk dashboard.
      </p>
      <div className="mt-6">
        <MfaPanel />
      </div>
    </div>
  );
}
