import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, inputClass } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { generateInviteCode } from "@/lib/utils";
import { useSession } from "@/lib/session";

const EMOJIS = ["⚽️", "🦁", "🔥", "⚡️", "🐉", "🦅", "🐺", "⭐️", "🏆", "🚀"];

export default function CreateTeam() {
  const nav = useNavigate();
  const { signIn } = useSession();
  const [teamName, setTeamName] = useState("");
  const [emoji, setEmoji] = useState("⚽️");
  const [myName, setMyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!teamName.trim() || !myName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const code = generateInviteCode();
      const { data: team, error: e1 } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          emoji,
          invite_code: code,
        })
        .select()
        .single();
      if (e1 || !team) throw e1 ?? new Error("チーム作成に失敗しました");

      const { data: member, error: e2 } = await supabase
        .from("members")
        .insert({ team_id: team.id, name: myName.trim(), role: "admin" })
        .select()
        .single();
      if (e2 || !member) throw e2 ?? new Error("メンバー登録に失敗しました");

      signIn(team.id, member.id);
      nav("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        "作成に失敗しました。データベースの初期設定（SQL実行）が済んでいるかご確認ください。"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-5 pt-[calc(1rem+var(--safe-top))]">
      <button
        onClick={() => nav(-1)}
        className="tap-shrink mb-4 flex items-center gap-1 text-pitch-600"
      >
        <ChevronLeftIcon width={22} height={22} /> 戻る
      </button>

      <h1 className="mb-6 text-2xl font-bold">チームを作る</h1>

      <div className="space-y-5">
        <Field label="チーム名">
          <input
            className={inputClass}
            placeholder="例）たくまJr. サッカークラブ"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </Field>

        <div>
          <span className="mb-1.5 ml-1 block text-sm font-semibold text-slate-500">
            アイコン
          </span>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={
                  "tap-shrink flex h-12 w-12 items-center justify-center rounded-2xl text-2xl " +
                  (emoji === e
                    ? "bg-pitch-600 ring-2 ring-pitch-600"
                    : "bg-white ring-1 ring-slate-200")
                }
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Field label="あなたの名前（保護者）">
          <input
            className={inputClass}
            placeholder="例）山田（太郎の母）"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          disabled={busy || !teamName.trim() || !myName.trim()}
          onClick={handleCreate}
        >
          {busy ? "作成中…" : "チームを作成"}
        </Button>
        <p className="px-2 text-center text-xs text-slate-400">
          作成した人は「管理者」になり、予定や当番を編集できます
        </p>
      </div>
    </div>
  );
}
