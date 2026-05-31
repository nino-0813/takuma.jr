// 「明日の予定」を毎日リマインドする Edge Function（スケジュール実行）
// デプロイ: supabase functions deploy match-reminders
// 必要なシークレット: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
//                     PROJECT_URL, SERVICE_ROLE_KEY
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

function typeLabel(t: string) {
  return t === "match" ? "試合" : t === "practice" ? "練習" : "予定";
}

Deno.serve(async () => {
  try {
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );
    const supabase = createClient(
      Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 明日(日本時間)の 00:00〜24:00 を UTC 範囲に変換
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 3600 * 1000);
    const startUtcMs =
      Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + 1) -
      9 * 3600 * 1000;
    const endUtcMs = startUtcMs + 24 * 3600 * 1000;

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_at", new Date(startUtcMs).toISOString())
      .lt("start_at", new Date(endUtcMs).toISOString());
    if (error) throw error;

    let sent = 0;
    for (const ev of events ?? []) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("team_id", ev.team_id);
      if (!subs?.length) continue;

      const time = new Date(ev.start_at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      });
      const name =
        ev.type === "match" && ev.opponent ? `vs ${ev.opponent}` : ev.title;
      const parts = [`${time}開始`];
      if (ev.meet_time) parts.push(`集合 ${ev.meet_time}`);
      if (ev.location) parts.push(ev.location);

      const payload = JSON.stringify({
        title: `明日は${typeLabel(ev.type)}です ⚽️`,
        body: `${name}（${parts.join(" / ")}）`,
        url: `/event/${ev.id}`,
      });

      const res = await Promise.allSettled(
        subs.map((s) =>
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        )
      );
      sent += res.filter((r) => r.status === "fulfilled").length;
    }

    return new Response(JSON.stringify({ events: events?.length ?? 0, sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
