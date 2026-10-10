// Label status pesanan untuk PEMBELI (Pesanan Saya, halaman sukses) — satu sumber agar status baru tak
// tampil mentah (mis. "PROCESSING"). Admin memakai label sendiri di components/admin/order-manager.tsx.
export const CUSTOMER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu Pembayaran", cls: "bg-amber-100 text-amber-700" },
  PAID: { label: "Dibayar", cls: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Dikemas", cls: "bg-violet-100 text-violet-700" },
  SHIPPED: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-700" },
  DONE: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-rose-100 text-rose-700" },
};
