"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl" aria-hidden>
        😵
      </p>
      <h1 className="text-xl font-bold">Ups, ada yang error</h1>
      <p className="max-w-sm text-sm text-muted">
        Coba muat ulang halaman. Kalau masih error, cek log server — detail teknis tidak ditampilkan di sini demi
        keamanan.
      </p>
      <button
        onClick={reset}
        className="grad-accent mt-2 inline-flex min-h-[44px] items-center rounded-[12px] px-5 py-2 text-sm font-semibold text-white"
      >
        Coba lagi
      </button>
    </div>
  );
}
