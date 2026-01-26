/// <reference path="./deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey);

const serviceAccount = JSON.parse(
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!
);

const PROJECT_ID = serviceAccount.project_id;

/* ============================
   Firebase access token
============================ */

async function getAccessToken() {
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
    new TextEncoder().encode(
      serviceAccount.private_key
        .replace(/\\n/g, "\n")
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
    ),
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
  const { record } = await req.json();

  const { sender_id, receiver_id, content } = record;

  // 1. Fetch receiver tokens
  const { data: tokens } = await supabase
    .from("fcm_tokens")
    .select("token")
    .eq("user_id", receiver_id);

  if (!tokens || tokens.length === 0) {
    return new Response("No tokens", { status: 200 });
  }

  const accessToken = await getAccessToken();

  // 2. Send push to each token
  for (const t of tokens) {
    await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: {
              title: "New message",
              body: content,
            },
            data: {
              url: "/chat",
            },
          },
        }),
      }
    );
  }

  return new Response("OK", { status: 200 });
});
