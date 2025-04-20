import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const FILE_URL = "https://github.com/jberlowski/wroc-schedules/releases/download/v0.0.2-zip/out.json.zip";

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (path === "/api") {
    const query = url.search;
    const apiUrl = `https://www.wroclaw.pl/open-data/api/3/action/datastore_search${query}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
      },
    });
  }
  if (url.pathname === "/stopdata") {
    const res = await fetch(FILE_URL);
    const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";

    return new Response(res.body, {
      status: res.status,
      headers: {
        ...corsHeaders(),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=28800"
      },
    });
  }

  return new Response("Not found", { status: 404 });
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
