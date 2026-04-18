import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect(`${appUrl}/dashboard`);
}
