import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const target = process.env.SIGNALBRIDGE_API_URL ?? "http://localhost:8000";
  const base = target.startsWith("http") ? target : `http://${target}`;
  const { path } = await params;
  const url = new URL(`${base.replace(/\/$/, "")}/${path.join("/")}`);
  url.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  let response: Response;
  try {
    response = await fetch(url, { method: request.method, headers, body, cache: "no-store" });
  } catch {
    return Response.json(
      { detail: "SignalBridge API is unavailable. Please wait for the service to wake up, then try again." },
      { status: 502 }
    );
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
