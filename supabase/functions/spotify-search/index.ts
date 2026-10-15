// Supabase Edge Function: finds Spotify songs by name for the site's music player.
// Needs two secrets in Supabase: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.
// Call: GET /functions/v1/spotify-search?q=song name

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

let token: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (token && Date.now() < tokenExpiresAt) return token;
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("missing_spotify_keys");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("spotify_auth_failed_" + res.status);
  const data = await res.json();
  token = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return token!;
}

async function searchTracks(q: string): Promise<Response> {
  const url = "https://api.spotify.com/v1/search?type=track&limit=8&q=" + encodeURIComponent(q);
  return fetch(url, { headers: { Authorization: "Bearer " + (await getToken()) } });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return json({ error: "missing_query" }, 400);

  try {
    let res = await searchTracks(q);
    if (res.status === 401) {
      // Token expired early: get a fresh one and try once more.
      token = null;
      res = await searchTracks(q);
    }
    if (!res.ok) return json({ error: "spotify_search_failed", status: res.status }, 502);

    const data = await res.json();
    // deno-lint-ignore no-explicit-any
    const tracks = (data.tracks?.items || []).map((t: any) => {
      const images = t.album?.images || [];
      return {
        id: t.id,
        name: t.name,
        artists: (t.artists || []).map((a: { name: string }) => a.name).join(", "),
        image: images.length ? images[images.length - 1].url : null,
      };
    });
    return json({ tracks });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
