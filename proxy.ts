import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const AUTH_PAGES = ["/login", "/signup"];

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // API routes never redirect; handlers return 401 JSON via requireUser().
  if (matches(pathname, "/api")) {
    return response;
  }

  if (!isAuthenticated && matches(pathname, "/dashboard")) {
    return redirectWithSession(request, response, "/login");
  }

  if (isAuthenticated && AUTH_PAGES.some((page) => matches(pathname, page))) {
    return redirectWithSession(request, response, "/dashboard");
  }

  return response;
}

// Carry refreshed auth cookies (and their no-cache headers) onto the redirect,
// otherwise the browser keeps the stale session.
function redirectWithSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
