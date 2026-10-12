import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { ContentsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ContentsPage() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  return (
    <Shell title="Konten" username={username}>
      <ContentsClient />
    </Shell>
  );
}
