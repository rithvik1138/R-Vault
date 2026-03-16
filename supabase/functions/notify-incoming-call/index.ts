import "./deno.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64 = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsigned = `${base64(header)}.${base64(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature))) // deno-lint-ignore no-deprecated-deno-api
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token as string | undefined;
}

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const record = body?.record ?? body;
    const { caller_id, receiver_id, call_type } = record ?? {};

    if (!caller_id || !receiver_id || !call_type) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountRaw) {
      return new Response(JSON.stringify({ ok: false, error: "Push not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const projectId = serviceAccount.project_id as string;

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("display_name,username,avatar_url")
      .eq("id", caller_id)
      .maybeSingle();

    const callerName =
      (callerProfile as { display_name?: string | null; username?: string | null } | null)?.display_name ||
      (callerProfile as { username?: string | null } | null)?.username ||
      "Someone";

    const { data: tokensData, error: tokensError } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", receiver_id);

    if (tokensError) {
      console.error("fcm_tokens error:", tokensError);
      return new Response(JSON.stringify({ ok: false, error: String(tokensError) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokens: { token: string }[] = Array.isArray(tokensData)
      ? (tokensData as { token: string }[])
      : [];

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      return new Response(JSON.stringify({ ok: false, error: "Auth failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const title = `Incoming ${String(call_type)} call`;
    const bodyText = `${callerName} is calling you`;

    for (const t of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              data: {
                title,
                body: bodyText,
                url: "/chat",
                kind: "incoming_call",
              },
              notification: { title, body: bodyText },
            },
          }),
        }
      );

      if (!res.ok) {
        console.error("FCM send error:", res.status, await res.text());
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: tokens.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-incoming-call error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

