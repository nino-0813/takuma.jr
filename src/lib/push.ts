import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

export function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** 現在この端末で通知が有効になっているか */
export async function isPushEnabled() {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub && Notification.permission === "granted";
  } catch {
    return false;
  }
}

/** 通知を有効化（許可を求めて購読をDBに保存） */
export async function enablePush(teamId: string, memberId: string) {
  if (!pushSupported()) {
    throw new Error("この端末/ブラウザは通知に対応していません");
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("通知の鍵(VAPID)が未設定です。設定手順をご確認ください。");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("通知が許可されませんでした");
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  await supabase.from("push_subscriptions").upsert(
    {
      team_id: teamId,
      member_id: memberId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    { onConflict: "endpoint" }
  );
}

/** 通知を無効化 */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

/** チームに通知を送る（Edge Function を呼ぶ。失敗してもアプリは止めない） */
export async function sendPush(args: {
  teamId: string;
  title: string;
  body: string;
  url?: string;
  excludeMemberId?: string;
}) {
  try {
    await supabase.functions.invoke("send-push", {
      body: {
        team_id: args.teamId,
        title: args.title,
        body: args.body,
        url: args.url ?? "/",
        exclude_member_id: args.excludeMemberId ?? null,
      },
    });
  } catch {
    /* 通知サーバー未設定でもアプリは動かす */
  }
}
