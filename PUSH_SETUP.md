# 🔔 プッシュ通知のセットアップ手順

アプリを閉じていても「新着連絡」「明日の試合リマインド」が届くようにする設定です。
一度やれば完了します。所要 15〜20分くらい。

> 前提：[`supabase/add_push.sql`](supabase/add_push.sql) を Supabase の SQL Editor で実行しておくこと。

---

## 1. VAPID キー（通知用のカギ）を作る

通知の送信には「公開鍵」と「秘密鍵」のペアが必要です。
パソコンのターミナルで次を実行します（Node が必要）。

```bash
npx web-push generate-vapid-keys
```

すると `Public Key:` と `Private Key:` が表示されます。両方メモしてください。

---

## 2. Vercel に公開鍵を登録（アプリ側）

Vercel → プロジェクト → **Settings → Environment Variables** に追加：

| Name | Value |
|------|-------|
| `VITE_VAPID_PUBLIC_KEY` | （手順1の Public Key） |

保存したら **Deployments → Redeploy** で再デプロイ。

---

## 3. Supabase に Edge Function をデプロイ（送信側）

パソコンに [Supabase CLI](https://supabase.com/docs/guides/cli) を入れて、プロジェクトフォルダで：

```bash
# ログイン & プロジェクト紐付け（初回のみ）
supabase login
supabase link --project-ref eaqaxpxywbbfmlvemcfz

# シークレット（鍵など）を登録
supabase secrets set \
  VAPID_PUBLIC_KEY="（手順1のPublic Key）" \
  VAPID_PRIVATE_KEY="（手順1のPrivate Key）" \
  VAPID_SUBJECT="mailto:あなたのメール@example.com" \
  PROJECT_URL="https://eaqaxpxywbbfmlvemcfz.supabase.co" \
  SERVICE_ROLE_KEY="（Supabase設定→API→service_role キー）"

# 2つの関数をデプロイ
supabase functions deploy send-push
supabase functions deploy match-reminders
```

> `service_role` キーは Supabase ダッシュボード → Project Settings → API → "service_role" にあります（秘密にしてください）。

---

## 4. 試合リマインドを毎日自動送信（スケジュール）

Supabase ダッシュボード → **Integrations → Cron**（または Database → Cron Jobs）で、
`match-reminders` 関数を毎日（例：毎日 18:00 JST = 09:00 UTC）に実行するジョブを作成します。

ダッシュボードの Cron 機能で「Edge Function を実行」を選び、`match-reminders` を指定すればOKです。
スケジュール例（UTC）: `0 9 * * *`（毎日 18:00 JST）。

---

## 5. 端末で通知をオンにする

アプリの **チーム** タブ →「🔔 プッシュ通知」をオン → 許可をタップ。
これを保護者それぞれの端末で行います。

- iPhone は **ホーム画面に追加したアプリ**から開いた状態でオンにしてください（iOS 16.4 以降）。
- これで、誰かがチャット／お知らせを投稿すると全員に通知が届きます。

---

## 動作の仕組み（参考）

- 新着チャット・お知らせ：投稿時にアプリが `send-push` 関数を呼び、チーム全員（投稿者以外）に送信
- 試合リマインド：`match-reminders` 関数が毎日「明日の予定」を探して送信
- 購読情報は `push_subscriptions` テーブルに保存（失効した端末は自動削除）

困ったら、まず手順2の再デプロイと手順5の通知オンを見直してください。
