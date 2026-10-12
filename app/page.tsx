import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Package, Plus, ScrollText, Send } from "lucide-react";
import { Shell } from "@/components/Shell";
import { PlatformStatus } from "@/components/PlatformStatus";
import { Card, StatCard } from "@/components/ui/Card";
import { PlatformBadge } from "@/components/ui/Badge";
import { getDb } from "@/lib/db";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { formatWIB, greeting, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  const db = getDb();

  const totalProducts = (db.prepare("SELECT COUNT(*) c FROM products").get() as { c: number }).c;
  const readyContents = (db.prepare("SELECT COUNT(*) c FROM contents WHERE status = 'ready'").get() as { c: number }).c;
  const upcoming = (db.prepare("SELECT COUNT(*) c FROM schedules WHERE status = 'scheduled'").get() as { c: number }).c;
  const sentWeek = (
    db
      .prepare("SELECT COUNT(*) c FROM schedules WHERE status = 'sent' AND created_at >= datetime('now', '-7 days')")
      .get() as { c: number }
  ).c;

  const spark = [1, 2, 1, 3, 2, 4, sentWeek];
  const nextSchedules = db
    .prepare(
      `SELECT s.id, s.publish_at, s.platforms, p.name AS product_name
       FROM schedules s JOIN contents c ON c.id = s.content_id JOIN products p ON p.id = c.product_id
       WHERE s.status = 'scheduled' ORDER BY s.publish_at ASC LIMIT 5`
    )
    .all() as { id: number; publish_at: string; platforms: string; product_name: string }[];

  return (
    <Shell title="Dashboard" username={username}>
      <div className="mesh-bg -mx-4 -mt-5 px-4 pb-6 pt-6">
        <h2 className="text-2xl font-black sm:text-3xl">
          {greeting()}, {username} 👋
        </h2>
        <p className="mt-1 text-sm text-muted">Ringkasan performa affiliate kamu hari ini.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<Package size={16} />} label="Produk" value={totalProducts} spark={spark} />
          <StatCard icon={<ScrollText size={16} />} label="Konten siap" value={readyContents} spark={spark} />
          <StatCard icon={<CalendarClock size={16} />} label="Terjadwal" value={upcoming} spark={spark} />
          <StatCard icon={<Send size={16} />} label="Terkirim 7 hari" value={sentWeek} spark={spark} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Jadwal terdekat</h3>
            <Link href="/schedules" className="text-sm font-semibold text-accent1 hover:underline">
              Lihat semua
            </Link>
          </div>
          {nextSchedules.length === 0 ? (
            <p className="text-sm text-muted">Belum ada jadwal. Buat konten lalu jadwalkan.</p>
          ) : (
            <ul className="space-y-3">
              {nextSchedules.map((s) => {
                let plats: string[] = [];
                try {
                  plats = JSON.parse(s.platforms);
                } catch {
                  plats = [];
                }
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-[12px] border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.product_name}</p>
                      <p className="tnum text-xs text-muted">
                        {formatWIB(s.publish_at)} WIB · {relativeTime(s.publish_at)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {plats.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-bold">Status platform</h3>
            <PlatformStatus />
          </Card>
          <Card className="card-hover p-5">
            <Link href="/products" className="flex items-center gap-3">
              <span className="grad-accent flex h-11 w-11 items-center justify-center rounded-[12px] text-white">
                <Plus size={20} />
              </span>
              <span>
                <span className="block font-bold">+ Produk baru</span>
                <span className="block text-sm text-muted">Tambah lalu generate konten AI ⚡</span>
              </span>
            </Link>
          </Card>
        </div>
      </div>
    </Shell>
  );
}


