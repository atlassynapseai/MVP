import { MobileSidebarWrapper } from "@/components/mobile-sidebar-wrapper";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/app-path";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${appUrl}/login`);

  return (
    <div className="flex h-screen overflow-hidden">
      <MobileSidebarWrapper userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto bg-gray-950 p-4 pt-16 md:p-6 md:pt-6">{children}</main>
    </div>
  );
}
