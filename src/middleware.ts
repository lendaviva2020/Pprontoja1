import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Rotas públicas (não exigem autenticação) ─────────────────────────────────
const PUBLIC_PATHS = ["/", "/busca", "/sobre", "/termos", "/privacidade"];

const PUBLIC_PREFIXES = [
  "/auth/",
  "/_next",
  "/api/auth",
  "/api/mercadopago/webhook",
  "/api/stripe/webhook",
  "/api/stripe/webhook-connect",
];

const WEBHOOK_ROUTES = [
  "/api/stripe/webhook",
  "/api/stripe/webhook-connect",
  "/api/mercadopago/webhook",
];

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://js.stripe.com",
  "https://hooks.stripe.com",
  "https://api.mercadopago.com",
].filter(Boolean) as string[];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (WEBHOOK_ROUTES.some((r) => pathname.startsWith(r))) {
    if (request.method !== "POST") {
      return new NextResponse("Method Not Allowed", { status: 405 });
    }
    return applySecurityHeaders(NextResponse.next({ request }), pathname);
  }

  if (pathname.startsWith("/api/")) {
    const corsResult = handleCors(request);
    if (corsResult) return corsResult;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Só alteramos a resposta — request.cookies é read-only no Edge (Vercel)
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/auth/login" || pathname === "/auth/cadastro")) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1);

    const role = roles?.[0]?.role;

    if (role === "professional") {
      return NextResponse.redirect(new URL("/profissional/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/cliente/dashboard", request.url));
  }

  if (user) {
    const inClientArea       = pathname.startsWith("/cliente");
    const inProfessionalArea = pathname.startsWith("/profissional");
    const inAdminArea        = pathname.startsWith("/admin");

    if (inClientArea || inProfessionalArea || inAdminArea) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1);

      const role = roles?.[0]?.role;
      const isAdmin = ["admin", "super_admin", "platform_admin"].includes(role ?? "");

      if (inClientArea && role === "professional") {
        return NextResponse.redirect(new URL("/profissional/dashboard", request.url));
      }

      if (inProfessionalArea && role === "client") {
        return NextResponse.redirect(new URL("/cliente/dashboard", request.url));
      }

      if (inAdminArea && !isAdmin) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return applySecurityHeaders(supabaseResponse, pathname);
}

function applySecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(self), microphone=(), camera=(), payment=(self)");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://sdk.mercadopago.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "frame-src https://js.stripe.com https://www.mercadopago.com.br",
    "connect-src 'self' https://api.stripe.com https://api.mercadopago.com https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  const noCache =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/cliente") ||
    pathname.startsWith("/profissional") ||
    pathname.startsWith("/admin");

  if (noCache) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");

  const isAllowed =
    !origin ||
    ALLOWED_ORIGINS.includes(origin) ||
    (process.env.NODE_ENV !== "production" &&
      (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")));

  if (request.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (origin && isAllowed) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.headers.set("Access-Control-Max-Age", "86400");
    }
    return res;
  }

  if (origin && !isAllowed && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Origin não permitida" }, { status: 403 });
  }

  return null;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
