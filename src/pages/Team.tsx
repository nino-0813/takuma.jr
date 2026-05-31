import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import {
  Avatar,
  Button,
  Card,
  Field,
  Sheet,
  Spinner,
  inputClass,
} from "@/components/ui";
import { LogoutIcon, ShareIcon, UsersIcon } from "@/components/icons";
import ProfileSheet from "@/components/ProfileSheet";
import MemberSheet from "@/components/MemberSheet";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import {
  disablePush,
  enablePush,
  isPushEnabled,
  pushSupported,
} from "@/lib/push";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Team() {
  const { team, member, isAdmin, signOut, refresh } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [copied, setCopied] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeErr, setCodeErr] = useState("");

  async function becomeAdmin() {
    if (!team || !member) return;
    setCodeBusy(true);
    setCodeErr("");
    const input = codeInput.trim().toUpperCase();
    if (!team.admin_code || input !== team.admin_code.toUpperCase()) {
      setCodeErr("コードが正しくありません");
      setCodeBusy(false);
      return;
    }
    await supabase.from("members").update({ role: "admin" }).eq("id", member.id);
    await refresh();
    await load();
    setCodeBusy(false);
    setShowAdminCode(false);
    setCodeInput("");
  }

  useEffect(() => {
    isPushEnabled().then(setPushOn);
  }, []);

  async function togglePush() {
    if (!team || !member || pushBusy) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
      } else {
        await enablePush(team.id, member.id);
        setPushOn(true);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "通知の設定に失敗しました");
    } finally {
      setPushBusy(false);
    }
  }

  async function load() {
    if (!team) return;
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at");
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  const inviteUrl = `${location.origin}/join/${team?.invite_code}`;

  async function share() {
    const text = `「${team?.name}」に参加しよう！\n${inviteUrl}\n（招待コード: ${team?.invite_code}）`;
    if (navigator.share) {
      try {
        await navigator.share({ title: team?.name, text, url: inviteUrl });
        return;
      } catch {
        /* キャンセル */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleAdmin(m: Member) {
    if (!isAdmin || m.id === member?.id) return;
    await supabase
      .from("members")
      .update({ role: m.role === "admin" ? "member" : "admin" })
      .eq("id", m.id);
    load();
  }

  return (
    <div>
      <PageHeader title="チーム" subtitle={team?.name} />

      <div className="space-y-4 px-4">
        {/* 招待カード */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-pitch-500 to-pitch-700 p-5 text-white">
            <p className="text-sm opacity-90">招待コード</p>
            <p className="mt-1 text-4xl font-bold tracking-[0.3em]">
              {team?.invite_code}
            </p>
          </div>
          <div className="p-3">
            <Button className="w-full" onClick={share}>
              <ShareIcon width={18} height={18} />
              {copied ? "コピーしました！" : "招待リンクを共有"}
            </Button>
            <p className="mt-2 px-2 text-center text-xs text-slate-400">
              このリンクをLINEなどで送ると、名前を入れるだけで参加できます
            </p>
          </div>
        </Card>

        {/* マイページ */}
        <Card
          onClick={() => setShowProfile(true)}
          className="tap-shrink flex cursor-pointer items-center gap-3 p-3.5"
        >
          <Avatar name={member?.name ?? ""} size={48} />
          <div className="flex-1">
            <p className="font-bold">{member?.name}</p>
            <p className="text-xs text-slate-400">
              マイページ・タップで情報を登録／編集
            </p>
          </div>
        </Card>

        {/* 通知 */}
        {pushSupported() && (
          <Card className="flex items-center gap-3 p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
              🔔
            </div>
            <div className="flex-1">
              <p className="font-bold">プッシュ通知</p>
              <p className="text-xs text-slate-400">
                新着連絡・試合リマインドをこの端末で受け取る
              </p>
            </div>
            <button
              onClick={togglePush}
              disabled={pushBusy}
              aria-label="通知の切り替え"
              className={cn(
                "h-7 w-12 rounded-full p-0.5 transition-colors disabled:opacity-50",
                pushOn ? "bg-pitch-500" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "block h-6 w-6 rounded-full bg-white shadow transition-transform",
                  pushOn && "translate-x-5"
                )}
              />
            </button>
          </Card>
        )}

        {/* 管理者 */}
        {isAdmin ? (
          <Card className="p-4">
            <p className="font-bold">👑 管理者コード</p>
            <p className="mt-0.5 text-xs text-slate-400">
              このコードを渡すと、その人もアプリから管理者になれます
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-xl font-bold tracking-[0.3em]">
                {team?.admin_code ?? "—"}
              </code>
              <button
                onClick={async () => {
                  if (team?.admin_code) {
                    await navigator.clipboard.writeText(team.admin_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                }}
                className="tap-shrink rounded-xl bg-pitch-50 px-3 py-2.5 text-sm font-semibold text-pitch-700"
              >
                {copied ? "コピー済" : "コピー"}
              </button>
            </div>
          </Card>
        ) : (
          <Card
            onClick={() => setShowAdminCode(true)}
            className="tap-shrink flex cursor-pointer items-center gap-3 p-3.5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
              👑
            </div>
            <div className="flex-1">
              <p className="font-bold">管理者になる</p>
              <p className="text-xs text-slate-400">
                管理者コードを入力すると予定や当番を編集できます
              </p>
            </div>
          </Card>
        )}

        {/* メンバー一覧 */}
        <section>
          <h2 className="mb-2 ml-1 flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <UsersIcon width={16} height={16} />
            メンバー（{members.length}人）
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <Card className="divide-y divide-slate-100">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setViewing(m)}
                  className="tap-shrink flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Avatar name={m.name} size={40} />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {m.name}
                      {m.id === member?.id && (
                        <span className="ml-1 text-xs text-pitch-600">
                          (あなた)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {m.child_name && `${m.child_name} `}
                      {m.jersey_number != null && `#${m.jersey_number} `}
                      {m.phone && `・${m.phone}`}
                    </p>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAdmin(m);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      m.role === "admin"
                        ? "bg-pitch-100 text-pitch-700"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {m.role === "admin" ? "管理者" : "メンバー"}
                  </span>
                </button>
              ))}
            </Card>
          )}
          {isAdmin && (
            <p className="mt-2 px-2 text-center text-xs text-slate-400">
              役割バッジをタップで管理者の切り替えができます
            </p>
          )}
        </section>

        <button
          onClick={() => {
            if (confirm("ログアウトしますか？再参加には招待コードが必要です。")) {
              signOut();
            }
          }}
          className="tap-shrink flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-red-500"
        >
          <LogoutIcon width={18} height={18} />
          ログアウト
        </button>
      </div>

      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onSaved={load}
      />
      <MemberSheet
        member={viewing}
        onClose={() => setViewing(null)}
        onUpdated={load}
      />

      <Sheet
        open={showAdminCode}
        onClose={() => setShowAdminCode(false)}
        title="管理者になる"
      >
        <div className="space-y-4 pb-2">
          <p className="px-1 text-sm text-slate-500">
            管理者から教えてもらった「管理者コード」を入力してください。
          </p>
          <Field label="管理者コード">
            <input
              className={inputClass + " text-center text-xl font-bold tracking-[0.3em] uppercase"}
              placeholder="______"
              value={codeInput}
              maxLength={6}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            />
          </Field>
          {codeErr && <p className="text-sm text-red-500">{codeErr}</p>}
          <Button
            className="w-full"
            disabled={codeBusy || codeInput.trim().length < 4}
            onClick={becomeAdmin}
          >
            {codeBusy ? "確認中…" : "管理者になる"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
