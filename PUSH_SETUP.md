# 🔔 プッシュ通知のセットアップ手順（CLI不要・ブラウザだけ）

アプリを閉じていても「新着連絡」「明日の試合リマインド」が届くようにする設定です。
**パソコンのコマンド操作は不要**。Supabaseの管理画面とVercelの画面だけで完了します。

> 前提：[`supabase/add_push.sql`](supabase/add_push.sql) を Supabase の SQL Editor で実行しておくこと。

---

## 1. VAPID キー（通知用のカギ）

Claude に作ってもらった2つのキーを使います（公開鍵・秘密鍵）。
無くした場合はターミナルで `npx web-push generate-vapid-keys` で作り直せます。

- **Public Key**（公開鍵）… 手順2と3で使う
- **Private Key**（秘密鍵）… 手順3で使う。**人に見せない・GitHubに載せない**

---

## 2. Vercel に公開鍵を登録（アプリ側）

Vercel → プロジェクト → **Settings → Environment Variables** に追加：

| Name | Value |
|------|-------|
| `VITE_VAPID_PUBLIC_KEY` | （Public Key を貼り付け） |

保存したら **Deployments** タブ → 最新の「…」→ **Redeploy** で再デプロイ。

---

## 3. Edge Function を作る（送信側）※ブラウザだけ

Supabase ダッシュボード → 左メニュー **Edge Functions** → **Create a new function**（ブラウザ上にエディタが開きます）。

### 3-1. `send-push` 関数
1. 名前を `send-push` にする
2. **「Verify JWT」/「Enforce JWT」のスイッチをオフ**にする（重要：アプリから呼べるように）
3. エディタの中身を全部消して、[`supabase/functions/send-push/index.ts`](supabase/functions/send-push/index.ts) の中身を丸ごと貼り付け
4. **Deploy** を押す

### 3-2. `match-reminders` 関数
1. もう一度 **Create a new function**、名前は `match-reminders`
2. 「Verify JWT」はオフでOK
3. [`supabase/functions/match-reminders/index.ts`](supabase/functions/match-reminders/index.ts) の中身を貼り付け
4. **Deploy**

---

## 4. シークレット（カギ）を登録 ※ブラウザだけ

Supabase ダッシュボード → **Edge Functions → Secrets**（または Project Settings → Edge Functions → Secrets / Manage secrets）で、次の3つを **Add new secret** で追加：

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | （Public Key） |
| `VAPID_PRIVATE_KEY` | （Private Key） |
| `VAPID_SUBJECT` | `mailto:あなたのメール@example.com` |

> `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` は Supabase が自動で渡してくれるので、登録不要です。

---

## 5. 試合リマインドを毎日自動送信（スケジュール）※ブラウザだけ

Supabase ダッシュボード → **Integrations → Cron**（または Database → Cron Jobs）→ **Create job**：
- 実行内容：**Supabase Edge Function** を選び `match-reminders` を指定
- スケジュール：`0 9 * * *`（UTC。毎日 18:00 JST に「明日の予定」を通知）

---

## 6. 端末で通知をオンにする

アプリの **チーム** タブ →「🔔 プッシュ通知」をオン → 許可をタップ。保護者それぞれの端末で行います。

- iPhone は **ホーム画面に追加したアプリ**から開いた状態でオンに（iOS 16.4 以降）。

---

## 仕組み（参考）
- 新着チャット・お知らせ：投稿時にアプリが `send-push` を呼び、チーム全員（投稿者以外）へ送信
- 試合リマインド：`match-reminders` が毎日「明日の予定」を探して送信
- 購読は `push_subscriptions` テーブルに保存（失効端末は自動削除）
