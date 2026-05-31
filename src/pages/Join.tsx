import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Field, FullSpinner, inputClass } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Team } from "@/lib/types";

export default function Join() {
  const { code } = useParams();
  const nav = useNavigate();
  const { signIn } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", (code ?? "").toUpperCase())
        .maybeSingle();
      setTeam((data as Team) ?? null);
      setLoading(false);
    })();
  }, [code]);

  async function handleJoin() {
    if (!team || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data: member, error } = await supabase
        .from("members")
        .insert({ team_id: team.id, name: name.trim(), role: "member" })
        .select()
        .single();
      if (error || !member) throw error;
      signIn(team.id, member.id);
      nav("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError("参加に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <FullSpinner />;

  if (!team) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-8 text-center">
        <div className="mb-3 text-5xl">🔍</div>
        <h1 className="text-xl font-bold">チームが見つかりません</h1>
        <p className="mt-2 text-slate-500">
          招待コードが正しいかご確認ください。
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => nav("/welcome")}>
          最初の画面へ
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pt-[calc(4rem+var(--safe-top))]">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white text-4xl shadow-md ring-1 ring-slate-100">
          {team.emoji ?? "⚽️"}
        </div>
        <p className="text-sm text-slate-400">このチームに参加します</p>
        <h1 className="mt-1 text-2xl font-bold">{team.name}</h1>
      </div>

      <div className="mt-10 space-y-4">
        <Field label="あなたの名前（保護者）">
          <input
            className={inputClass}
            placeholder="例）山田（太郎の母）"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <Button
          className="w-full"
          disabled={busy || !name.trim()}
          onClick={handleJoin}
        >
          {busy ? "参加中…" : "参加する"}
        </Button>
      </div>
    </div>
  );
}
