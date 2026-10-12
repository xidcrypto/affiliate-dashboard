import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  return (
    <Shell title="Pengaturan" username={username}>
      <SettingsClient username={username} />
    </Shell>
  );
}
