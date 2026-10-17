// Supabase Edge Function: log in with a username without ever sending anyone's email to the browser.
// The browser sends { username, password }. The email is looked up and the password checked here,
// and only the login session (access + refresh token) goes back.
// Uses SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to every function.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// For the database search only: % and _ are wildcards in ilike, and PostgREST also treats * as one.
// The exact (case-insensitive) match is checked afterwards in code anyway.
function searchPattern(name: string): string {
  return name.replace(/[\\%_]/g, (c) => "\\" + c).replace(/\*/g, "_");
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const username = String(body?.username ?? "").trim().slice(0, 40);
  const password = String(body?.password ?? "");
  if (!username || !password) return json({ error: "bad_request" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, noSession);

  // Find the account by username, ignoring upper/lower case like signup does.
  const { data: rows, error: lookupError } = await admin
    .from("profiles")
    .select("id, fullname")
    .ilike("fullname", searchPattern(username))
    .limit(20);
  if (lookupError) return json({ error: "server_error" }, 500);
  const matches = (rows || []).filter((r) => String(r.fullname).toLowerCase() === username.toLowerCase());
  if (matches.length !== 1) return json({ error: "username_not_found" }, 404);

  const { data: found, error: userError } = await admin.auth.admin.getUserById(matches[0].id);
  const email = found?.user?.email;
  if (userError || !email) return json({ error: "username_not_found" }, 404);

  // Check the password the normal way; the email never leaves this function.
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, noSession);
  const { data: login, error: loginError } = await anon.auth.signInWithPassword({ email, password });
  if (loginError) {
    // Supabase only reports "not confirmed" after the password was right, so this is the account owner:
    // they get their own email back to finish confirming it.
    if (loginError.code === "email_not_confirmed" || /not confirmed/i.test(loginError.message)) {
      return json({ error: "email_not_confirmed", email }, 403);
    }
    if (loginError.status === 429) return json({ error: "too_many_attempts" }, 429);
    return json({ error: "invalid_credentials" }, 401);
  }

  return json({ access_token: login.session!.access_token, refresh_token: login.session!.refresh_token });
});
