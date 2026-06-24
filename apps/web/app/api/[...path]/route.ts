import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_API_URL = "https://signalbridge-api-6wc6.onrender.com";
// Render's free tier spins the API down after ~15 min idle; a cold start can take
// 30-50s. Keep this above that window so the first request after idle waits for the
// service to wake instead of failing with a 502.
const REQUEST_TIMEOUT_MS = 55000;

function normalizeBaseUrl(target: string) {
  const trimmed = target.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.endsWith(".onrender.com") || trimmed.includes(".onrender.com:")) return `https://${trimmed}`;
  return `http://${trimmed}`;
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const target = process.env.SIGNALBRIDGE_API_URL ?? DEFAULT_API_URL;
  const base = normalizeBaseUrl(target);
  const { path } = await params;
  const url = new URL(`${base}/${path.join("/")}`);
  url.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "accept", "cookie"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(url, { method: request.method, headers, body, cache: "no-store", signal: controller.signal });
  } catch {
    return Response.json(
      { detail: "SignalBridge API is unavailable. Please wait for the service to wake up, then try again." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Relay the auth cookie the backend sets on login/register/guest/logout so it
  // lands on the browser (same web origin), keeping the JWT out of JS storage.
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : ([response.headers.get("set-cookie")].filter(Boolean) as string[]);
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
