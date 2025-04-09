import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const query = url.search;
  const api = `https://www.wroclaw.pl/open-data/api/3/action/datastore_search${query}`;
  const apiRes = await fetch(api);
  const data = await apiRes.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
