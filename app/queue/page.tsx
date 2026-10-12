import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { QueueClient } from "./client";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  return (
    <Shell title="Antrean" username={username}>
      <QueueClient />
    </Shell>
  );
}
