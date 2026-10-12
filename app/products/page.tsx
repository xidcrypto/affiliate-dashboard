import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { guardPage, hasAnyUserSync } from "@/lib/guards";
import { ProductsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  if (!hasAnyUserSync()) redirect("/setup");
  const username = await guardPage();
  return (
    <Shell title="Produk" username={username}>
      <ProductsClient />
    </Shell>
  );
}
