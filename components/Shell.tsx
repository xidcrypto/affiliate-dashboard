"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Home,
  ListVideo,
  LogOut,
  Package,
  ScrollText,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { clsx } from "clsx";
import { ToastProvider, useToast } from "./ui/Toast";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/contents", label: "Konten", icon: ScrollText },
  { href: "/schedules", label: "Jadwal", icon: CalendarClock },
  { href: "/queue", label: "Antrean", icon: ListVideo },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    setTheme(m ? decodeURIComponent(m[1]) : "dark");
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    setTheme(next);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };
  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted hover:bg-surface2 hover:text-fg"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

function ConnDot() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/poster/status")
      .then((r) => r.json())
      .then((j) => {
        if (alive) setOk(!!j.status);
      })
      .catch(() => alive && setOk(false));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <span
      title={ok === null ? "Memeriksa koneksi..." : ok ? "Social-poster terhubung" : "Social-poster tidak terjangkau"}
      aria-label={ok === null ? "Memeriksa koneksi" : ok ? "Terhubung" : "Terputus"}
      className={clsx(
        "inline-block h-2.5 w-2.5 rounded-full",
        ok === null ? "bg-warning" : ok ? "bg-success" : "bg-danger"
      )}
    />
  );
}

function Inner({ children, title, username }: { children: React.ReactNode; title: string; username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast("Gagal keluar", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface/80 glass md:flex",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="grad-accent flex h-9 w-9 items-center justify-center rounded-[10px] text-lg font-black text-white" aria-hidden>
            A
          </div>
          {!collapsed && <span className="font-heading text-base font-bold">Affiliate<span className="grad-text">Dash</span></span>}
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navigasi utama">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors",
                  active ? "grad-accent text-white shadow-soft" : "text-muted hover:bg-surface2 hover:text-fg"
                )}
              >
                <Icon size={19} aria-hidden />
                {!collapsed && n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-border text-muted hover:bg-surface2 hover:text-fg"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>
      </aside>

      <div className={clsx("md:pl-[260px]", collapsed && "md:pl-[72px]")}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface/80 glass">
          <div className="mx-auto flex h-16 max-w-content items-center gap-3 px-4">
            <h1 className="flex-1 truncate text-base font-bold sm:text-lg">{title}</h1>
            <ConnDot />
            <ThemeToggle />
            <span className="hidden max-w-[140px] truncate text-sm text-muted sm:inline" title={username}>
              {username}
            </span>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-border px-3 text-sm font-semibold text-muted hover:bg-surface2 hover:text-fg disabled:opacity-50"
            >
              <LogOut size={16} aria-hidden />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-content px-4 pb-28 pt-5 md:pb-10">{children}</main>
      </div>

      {/* Bottom tab bar mobile */}
      <nav aria-label="Navigasi bawah" className="bottom-tabs fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 glass md:hidden">
        <div className="grid grid-cols-5">
          {NAV.slice(0, 5).map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-accent1" : "text-muted"
                )}
              >
                <Icon size={20} aria-hidden />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Shell(props: { children: React.ReactNode; title: string; username: string }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}
