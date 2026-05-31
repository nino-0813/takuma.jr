// チームのメンバーにプッシュ通知を送る Edge Function
// デプロイ: supabase functions deploy send-push
// 必要なシークレット: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
//                     PROJECT_URL, SERVICE_ROLE_KEY
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { team_id, title, body, url, exclude_member_id } = await req.json();
    if (!team_id || !title) {
      return new Response(JSON.stringify({ error: "team_id and title required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("team_id", team_id);
    if (exclude_member_id) query = query.neq("member_id", exclude_member_id);
    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });

    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    // 失効した購読(404/410)は削除
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (
        r.status === "rejected" &&
        (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)
      ) {
        dead.push(subs![i].endpoint);
      }
    });
    if (dead.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", dead);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent, removed: dead.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
