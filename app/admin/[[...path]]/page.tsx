import { HostedAdmin } from "@/components/hosted-admin/app";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { path: [] },
    { path: ["login"] },
    { path: ["products"] },
    { path: ["products", "new"] },
    { path: ["categories"] },
    { path: ["categories", "new"] },
    { path: ["media"] },
    { path: ["settings"] },
  ];
}

export default function AdminCatchAllPage() {
  return <HostedAdmin />;
}
