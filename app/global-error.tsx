"use client";

// Cadangan terakhir: error di root layout sendiri (layout & CSS tak termuat) → HTML polos dengan gaya inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Halaman gagal dimuat</h1>
          <p style={{ color: "#666", lineHeight: 1.5 }}>Maaf, ada gangguan sementara. Coba lagi sebentar lagi.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: "12px 22px", borderRadius: 999, border: 0, background: "#111", color: "#fff", fontSize: 15, cursor: "pointer" }}
          >
            Coba lagi
          </button>
          {error.digest && <p style={{ marginTop: 24, fontFamily: "monospace", fontSize: 11, color: "#999" }}>Kode: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
