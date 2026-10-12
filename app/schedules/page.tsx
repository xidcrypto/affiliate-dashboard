import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { SchedulesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  return (
    <Shell title="Jadwal" username={username}>
      <SchedulesClient />
    </Shell>
  );
}
