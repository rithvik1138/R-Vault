import "./deno.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey);

// FIREBASE_SERVICE_ACCOUNT is read inside the handler so we can return 200 when missing

/* ============================
   Firebase access token
============================ */

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Accept either a raw PEM string or a JSON-escaped PEM containing "\n"
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
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

  const jwt = `${unsigned}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
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
  return data.access_token;
}

/* ============================
   HTTP handler (called by DB)
============================ */

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const record = body?.record ?? body;
    if (!record) {
      return new Response(JSON.stringify({ ok: false, error: "Missing record" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const { sender_id, receiver_id, content } = record;

    // Group messages have no single receiver; skip FCM (or extend later to resolve members)
    if (!receiver_id) {
      return new Response(JSON.stringify({ ok: true, skipped: "group" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountRaw) {
      console.error("FIREBASE_SERVICE_ACCOUNT not set");
      return new Response(JSON.stringify({ ok: false, error: "Push not configured" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const projectId = serviceAccount.project_id;

    // 1. Fetch receiver FCM tokens
    const { data: tokensData, error: tokensError } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", receiver_id);

    if (tokensError) {
      console.error("fcm_tokens error:", tokensError);
      return new Response(JSON.stringify({ ok: false, error: String(tokensError) }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const tokens: { token: string }[] = Array.isArray(tokensData) ? (tokensData as { token: string }[]) : [];
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
      console.error("Failed to get Firebase access token");
      return new Response(JSON.stringify({ ok: false, error: "Auth failed" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const title = "New message";
    const bodyText = (content && String(content).slice(0, 200)) || "You have a new message";

    // 2. Send push to each token
    for (const t of tokens) {
      try {
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
                },
                notification: {
                  title,
                  body: bodyText,
                },
              },
            }),
          }
        );
        if (!res.ok) {
          const errText = await res.text();
          console.error("FCM send error:", res.status, errText);
        }
      } catch (e) {
        console.error("FCM request error:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: tokens.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-message error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
