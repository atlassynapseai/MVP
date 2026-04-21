import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function getPublicPrefixes(): string[] {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const base = appUrl ? new URL(appUrl).pathname.replace(/\/$/, "") : "";
  const routes = ["/login", "/auth/callback", "/api/ingest", "/api/cron/", "/privacy", "/terms", "/api/webhooks/zapier"];
  if (base) {
    return [...routes, ...routes.map((r) => `${base}${r}`)];
  }
  return routes;
}

const PUBLIC_PREFIXES = getPublicPrefixes();

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: always call getUser() (not getSession()) to validate the JWT server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(`${(process.env.NEXT_PUBLIC_APP_URL ?? "").trim()}/login`);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
