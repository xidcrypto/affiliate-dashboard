import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="grad-text text-6xl font-black">404</p>
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted">
        Sepertinya kamu nyasar — link-nya salah atau halamannya sudah dipindah.
      </p>
      <Link
        href="/"
        className="grad-accent mt-2 inline-flex min-h-[44px] items-center rounded-[12px] px-5 py-2 text-sm font-semibold text-white"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
