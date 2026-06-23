import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_API_URL = "https://signalbridge-api.onrender.com";
const REQUEST_TIMEOUT_MS = 15000;

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
  for (const name of ["authorization", "content-type", "accept"]) {
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
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
